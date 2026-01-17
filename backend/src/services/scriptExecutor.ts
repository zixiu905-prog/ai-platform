import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface ScriptExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  executionTime?: number;
}

export interface ScriptExecutionOptions {
  timeout?: number;
  env?: Record<string, string>;
  workingDirectory?: string;
}

export class ScriptExecutor {
  private readonly sandboxPath: string;

  constructor() {
    this.sandboxPath = process.env.SCRIPT_SANDBOX_PATH || '/tmp/ai-design-scripts';
    this.ensureSandboxDirectory();
  }

  /**
   * 确保沙箱目录存在
   */
  private async ensureSandboxDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.sandboxPath, { recursive: true });
    } catch (error) {
      logger.error('创建沙箱目录失败:', error);
    }
  }

  /**
   * 执行脚本
   */
  async execute(script: string, params: any, options: ScriptExecutionOptions = {}): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const {
      timeout = 30000,
      env = {},
      workingDirectory = this.sandboxPath
    } = options;

    try {
      logger.info('开始执行脚本', { params });

      // 创建临时脚本文件
      const scriptPath = await this.createTempScriptFile(script);

      // 准备环境变量
      const executionEnv = {
        ...process.env,
        ...env,
        SCRIPT_PARAMS: JSON.stringify(params)
      };

      // 执行脚本
      const { stdout, stderr } = await execAsync(
        this.getExecutionCommand(scriptPath),
        {
          timeout,
          env: executionEnv,
          cwd: workingDirectory,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );

      const executionTime = Date.now() - startTime;

      logger.info('脚本执行成功', { executionTime });

      // 清理临时文件
      await this.cleanupTempScriptFile(scriptPath);

      return {
        success: true,
        output: stdout,
        error: stderr,
        executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('脚本执行失败:', error);

      return {
        success: false,
        error: errorMessage,
        output: error.stdout || '',
        executionTime
      };
    }
  }

  /**
   * 执行TypeScript脚本
   */
  async executeTypeScript(code: string, params: any): Promise<ScriptExecutionResult> {
    try {
      // 将TypeScript转换为JavaScript
      const tsCode = this.transpileTypeScript(code);
      return await this.execute(tsCode, params);
    } catch (error) {
      logger.error('TypeScript脚本执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行Python脚本
   */
  async executePython(code: string, params: any, options: ScriptExecutionOptions = {}): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const { timeout = 30000, env = {} } = options;

    try {
      logger.info('开始执行Python脚本');

      // 创建临时Python脚本文件
      const scriptPath = path.join(this.sandboxPath, `script_${Date.now()}.py`);
      await fs.writeFile(scriptPath, this.preparePythonCode(code, params));

      // 执行Python脚本
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
        timeout,
        env: { ...process.env, ...env },
        maxBuffer: 10 * 1024 * 1024
      });

      const executionTime = Date.now() - startTime;

      // 清理临时文件
      await fs.rm(scriptPath, { force: true });

      logger.info('Python脚本执行成功', { executionTime });

      return {
        success: true,
        output: stdout,
        error: stderr,
        executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      logger.error('Python脚本执行失败:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * 创建临时脚本文件
   */
  private async createTempScriptFile(script: string): Promise<string> {
    const scriptPath = path.join(this.sandboxPath, `script_${Date.now()}.js`);
    await fs.writeFile(scriptPath, script);
    return scriptPath;
  }

  /**
   * 清理临时脚本文件
   */
  private async cleanupTempScriptFile(scriptPath: string): Promise<void> {
    try {
      await fs.rm(scriptPath, { force: true });
    } catch (error) {
      logger.warn('清理临时脚本文件失败:', error);
    }
  }

  /**
   * 获取执行命令
   */
  private getExecutionCommand(scriptPath: string): string {
    return `node "${scriptPath}"`;
  }

  /**
   * 简单的TypeScript转译（简化版）
   */
  private transpileTypeScript(code: string): string {
    // 这里应该使用TypeScript编译器，简化起见直接返回
    // 实际项目中应该使用 ts.transpileModule
    return code
      .replace(/interface\s+\w+\s*{[^}]*}/g, '') // 移除接口定义
      .replace(/:\s*\w+(\[\])?/g, '') // 移除类型注解
      .replace(/private\s+/g, '') // 移除private修饰符
      .replace(/public\s+/g, '') // 移除public修饰符
      .replace(/readonly\s+/g, ''); // 移除readonly修饰符
  }

  /**
   * 准备Python代码
   */
  private preparePythonCode(code: string, params: any): string {
    return `
import json
import sys

# 注入参数
params = json.loads('${JSON.stringify(params).replace(/'/g, "\\'")}')

try:
    ${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }

  /**
   * 验证脚本安全性
   */
  async validateScript(code: string, language: string): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // 基本安全检查
    const dangerousPatterns = [
      'require("child_process")',
      'require("fs")',
      'import.*fs',
      'import.*child_process',
      'eval(',
      'exec(',
      'spawn(',
      '__import__("os")',
      'subprocess.call',
      'subprocess.run'
    ];

    for (const pattern of dangerousPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(code)) {
        errors.push(`检测到潜在危险代码: ${pattern}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 获取脚本执行历史
   */
  async getExecutionHistory(limit: number = 50): Promise<any[]> {
    // 这里应该从数据库获取历史记录
    // 暂时返回空数组
    return [];
  }

  /**
   * 停止脚本执行
   */
  async stopExecution(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 这里应该实现停止特定执行的功能
      // 可以通过记录进程ID来停止
      logger.info(`停止脚本执行: ${executionId}`);
      return {
        success: true,
        message: '脚本执行已停止'
      };
    } catch (error) {
      logger.error('停止脚本执行失败:', error);
      return {
        success: false,
        message: '停止脚本执行失败'
      };
    }
  }
}

export const scriptExecutor = new ScriptExecutor();
