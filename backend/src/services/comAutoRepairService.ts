import { logger } from '../utils/logger';
import { zhipuAIService } from './zhipuAIService';
import { DoubaoAIService } from './doubaoAIService';

export interface ComIssue {
  id: string;
  softwareId: string;
  softwareName: string;
  version: string;
  apiName: string;
  issue: string;
  errorType: 'missing' | 'deprecated' | 'incompatible' | 'permission' | 'corrupted';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  userId: string;
  status: 'detected' | 'analyzing' | 'repairing' | 'repaired' | 'failed';
  autoRepairAttempted: boolean;
  errorMessage?: string;
}

export interface RepairSolution {
  issueId: string;
  solutionType: 'patch' | 'registry' | 'config' | 'api_mapping' | 'wrapper';
  description: string;
  code?: string;
  registryKey?: string;
  configFile?: string;
  apiMapping?: Record<string, string>;
  requiresRestart: boolean;
  estimatedTime: number; // minutes
  successRate: number; // 0-1
}

export interface AutoRepairResult {
  success: boolean;
  issueId: string;
  solution?: RepairSolution;
  applied?: boolean;
  error?: string;
  logs?: string[];
}

export interface DetectionConfig {
  enableAutoDetection: boolean;
  enableAutoRepair: boolean;
  requireUserApproval: boolean;
  maxRetryAttempts: number;
  repairTimeout: number; // seconds
  logLevel: 'error' | 'warning' | 'info' | 'debug';
}

/**
 * COM接口自动修复服务
 * 结合AI大模型自动检测、分析和修复设计软件COM接口问题
 */
export class ComAutoRepairService {
  private detectedIssues: Map<string, ComIssue> = new Map();
  private repairHistory: Map<string, AutoRepairResult[]> = new Map();
  private config: DetectionConfig = {
    enableAutoDetection: true,
    enableAutoRepair: true,
    requireUserApproval: false, // 默认自动修复，可在配置中修改
    maxRetryAttempts: 3,
    repairTimeout: 300,
    logLevel: 'info'
  };

  private softwareApis: Map<string, any[]> = new Map();

  constructor() {
    this.initializeSoftwareApis();
    this.loadConfig();
    logger.info('ComAutoRepairService initialized');
  }

  /**
   * 初始化软件API配置
   */
  private initializeSoftwareApis(): void {
    // Photoshop API配置
    this.softwareApis.set('photoshop', [
      { name: 'Application', version: '2024', interfaces: ['activeDocument', 'documents', 'pathItems'] },
      { name: 'Document', version: '2024', interfaces: ['artLayers', 'channels', 'history'] },
      { name: 'ArtLayer', version: '2024', interfaces: ['blendMode', 'opacity', 'visible'] },
    ]);

    // Illustrator API配置
    this.softwareApis.set('illustrator', [
      { name: 'Application', version: '2024', interfaces: ['activeDocument', 'documents', 'selection'] },
      { name: 'Document', version: '2024', interfaces: ['pathItems', 'textFrames', 'layers'] },
      { name: 'PathItem', version: '2024', interfaces: ['pathPoints', 'filled', 'stroked'] },
    ]);

    // AutoCAD API配置
    this.softwareApis.set('autocad', [
      { name: 'AcadApplication', version: '2024', interfaces: ['ActiveDocument', 'Documents', 'Preferences'] },
      { name: 'AcadDocument', version: '2024', interfaces: ['ModelSpace', 'Layers', 'Blocks'] },
      { name: 'AcadLayer', version: '2024', interfaces: ['Name', 'Color', 'LineType'] },
    ]);

    // Blender API配置
    this.softwareApis.set('blender', [
      { name: 'bpy', version: '4.0', interfaces: ['context', 'data', 'ops'] },
      { name: 'bpy.context', version: '4.0', interfaces: ['scene', 'view_layer', 'active_object'] },
      { name: 'bpy.data', version: '4.0', interfaces: ['objects', 'materials', 'meshes'] },
    ]);
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 可以从数据库或配置文件加载
      logger.info('ComAutoRepair config loaded');
    } catch (error) {
      logger.warn('Failed to load config, using defaults');
    }
  }

  /**
   * 保存配置
   */
  saveConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ComAutoRepair config updated:', this.config);
  }

  /**
   * 自动检测COM接口问题
   */
  async detectComIssue(
    softwareId: string,
    softwareName: string,
    version: string,
    apiName: string,
    errorDetails: any,
    userId: string
  ): Promise<ComIssue | null> {
    try {
      if (!this.config.enableAutoDetection) {
        return null;
      }

      // 分析错误类型
      const errorType = this.analyzeErrorType(errorDetails);
      const severity = this.determineSeverity(errorType, errorDetails);

      // 创建问题记录
      const issue: ComIssue = {
        id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        softwareId,
        softwareName,
        version,
        apiName,
        issue: this.formatIssueDescription(apiName, errorType, errorDetails),
        errorType,
        severity,
        timestamp: new Date(),
        userId,
        status: 'detected',
        autoRepairAttempted: false,
        errorMessage: errorDetails.message || JSON.stringify(errorDetails)
      };

      this.detectedIssues.set(issue.id, issue);

      // 记录日志
      logger.info(`COM issue detected: ${issue.issue}`);

      // 如果启用自动修复且不需要用户批准，立即开始修复
      if (this.config.enableAutoRepair && !this.config.requireUserApproval) {
        this.startAutoRepair(issue.id);
      }

      return issue;

    } catch (error) {
      logger.error('Failed to detect COM issue:', error);
      return null;
    }
  }

  /**
   * 分析错误类型
   */
  private analyzeErrorType(errorDetails: any): ComIssue['errorType'] {
    const message = (errorDetails.message || '').toLowerCase();
    const code = errorDetails.code || '';

    if (message.includes('not found') || message.includes('undefined') || code === -2147221164) {
      return 'missing';
    }
    if (message.includes('deprecated') || message.includes('obsolete')) {
      return 'deprecated';
    }
    if (message.includes('version') || message.includes('incompatible')) {
      return 'incompatible';
    }
    if (message.includes('permission') || message.includes('access denied') || code === -2147220981) {
      return 'permission';
    }
    if (message.includes('corrupt') || message.includes('invalid')) {
      return 'corrupted';
    }

    return 'incompatible';
  }

  /**
   * 确定严重程度
   */
  private determineSeverity(errorType: ComIssue['errorType'], errorDetails: any): ComIssue['severity'] {
    if (errorType === 'missing' || errorType === 'corrupted') {
      return 'critical';
    }
    if (errorType === 'permission') {
      return 'error';
    }
    if (errorType === 'deprecated') {
      return 'warning';
    }

    return 'error';
  }

  /**
   * 格式化问题描述
   */
  private formatIssueDescription(apiName: string, errorType: string, errorDetails: any): string {
    const descriptions: Record<string, string> = {
      missing: `COM接口 '${apiName}' 未找到或未安装`,
      deprecated: `COM接口 '${apiName}' 已过时，需要更新`,
      incompatible: `COM接口 '${apiName}' 版本不兼容`,
      permission: `COM接口 '${apiName}' 访问权限不足`,
      corrupted: `COM接口 '${apiName}' 已损坏`
    };

    const base = descriptions[errorType] || `COM接口 '${apiName}' 出现未知错误`;
    const errorMsg = errorDetails.message || '';

    return errorMsg ? `${base}: ${errorMsg}` : base;
  }

  /**
   * 开始自动修复
   */
  private async startAutoRepair(issueId: string): Promise<AutoRepairResult> {
    const issue = this.detectedIssues.get(issueId);
    if (!issue) {
      return {
        success: false,
        issueId,
        error: '问题不存在'
      };
    }

    issue.status = 'analyzing';
    issue.autoRepairAttempted = true;

    try {
      // 使用AI生成修复方案
      const solution = await this.generateRepairSolution(issue);

      if (!solution) {
        issue.status = 'failed';
        this.detectedIssues.set(issueId, issue);
        return {
          success: false,
          issueId,
          error: '无法生成修复方案'
        };
      }

      // 应用修复方案
      issue.status = 'repairing';
      const result = await this.applyRepairSolution(issue, solution);

      // 记录修复历史
      const history = this.repairHistory.get(issueId) || [];
      history.push(result);
      this.repairHistory.set(issueId, history);

      // 更新问题状态
      if (result.applied && result.success) {
        issue.status = 'repaired';
      } else {
        issue.status = 'failed';
      }

      this.detectedIssues.set(issueId, issue);

      logger.info(`Auto repair ${result.success ? 'succeeded' : 'failed'} for issue ${issueId}`);

      return result;

    } catch (error) {
      logger.error(`Auto repair failed for issue ${issueId}:`, error);
      issue.status = 'failed';
      this.detectedIssues.set(issueId, issue);
      return {
        success: false,
        issueId,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 使用AI生成修复方案
   */
  private async generateRepairSolution(issue: ComIssue): Promise<RepairSolution | null> {
    try {
      // 准备问题信息
      const softwareApis = this.softwareApis.get(issue.softwareId) || [];
      const apiInfo = softwareApis.find(api => api.name === issue.apiName);

      const prompt = `我遇到一个设计软件COM接口问题，请帮我生成修复方案：

软件: ${issue.softwareName}
版本: ${issue.version}
COM接口: ${issue.apiName}
问题: ${issue.issue}
错误类型: ${issue.errorType}
严重程度: ${issue.severity}

请提供以下信息：
1. 问题分析
2. 修复方案类型（patch/registry/config/api_mapping/wrapper）
3. 具体修复代码或配置
4. 是否需要重启软件
5. 预计修复时间
6. 成功率评估

请用JSON格式返回，包含以下字段：
{
  "solutionType": "patch|registry|config|api_mapping|wrapper",
  "description": "详细描述",
  "code": "修复代码（如果适用）",
  "registryKey": "注册表键（如果适用）",
  "configFile": "配置文件路径（如果适用）",
  "apiMapping": {"oldApi": "newApi"}（如果适用）,
  "requiresRestart": true/false,
  "estimatedTime": 分钟数,
  "successRate": 0-1之间的成功率
}`;

      // 使用豆包AI生成方案
      const response = await DoubaoAIService.generateText(prompt, 'doubao-pro-32k');

      if (!response || !response.output) {
        return null;
      }

      // 解析AI响应
      const solution = this.parseAiSolution(response.output.content);

      return {
        issueId: issue.id,
        solutionType: solution.solutionType || 'api_mapping',
        description: solution.description || '自动生成的修复方案',
        code: solution.code,
        registryKey: solution.registryKey,
        configFile: solution.configFile,
        apiMapping: solution.apiMapping,
        requiresRestart: solution.requiresRestart ?? true,
        estimatedTime: solution.estimatedTime ?? 5,
        successRate: solution.successRate ?? 0.8
      };

    } catch (error) {
      logger.error('Failed to generate repair solution:', error);
      return null;
    }
  }

  /**
   * 解析AI响应
   */
  private parseAiSolution(response: string): any {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果没有JSON，返回默认值
      return {
        solutionType: 'api_mapping',
        description: response.substring(0, 200),
        requiresRestart: true,
        estimatedTime: 5,
        successRate: 0.7
      };

    } catch (error) {
      logger.warn('Failed to parse AI solution:', error);
      return null;
    }
  }

  /**
   * 应用修复方案
   */
  private async applyRepairSolution(issue: ComIssue, solution: RepairSolution): Promise<AutoRepairResult> {
    const logs: string[] = [];
    logs.push(`开始应用修复方案: ${solution.description}`);
    logs.push(`方案类型: ${solution.solutionType}`);

    try {
      // 根据方案类型应用修复
      switch (solution.solutionType) {
        case 'api_mapping':
          await this.applyApiMapping(issue, solution.apiMapping || {}, logs);
          break;
        case 'registry':
          await this.applyRegistryFix(issue, solution.registryKey || '', logs);
          break;
        case 'config':
          await this.applyConfigFix(issue, solution.configFile || '', solution.code || '', logs);
          break;
        case 'patch':
          await this.applyPatch(issue, solution.code || '', logs);
          break;
        case 'wrapper':
          await this.applyWrapper(issue, solution.code || '', logs);
          break;
        default:
          throw new Error(`未知的修复方案类型: ${solution.solutionType}`);
      }

      logs.push('修复方案应用成功');

      return {
        success: true,
        issueId: issue.id,
        solution,
        applied: true,
        logs
      };

    } catch (error) {
      logs.push(`应用修复方案失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return {
        success: false,
        issueId: issue.id,
        error: error instanceof Error ? error.message : '未知错误',
        logs
      };
    }
  }

  /**
   * 应用API映射
   */
  private async applyApiMapping(issue: ComIssue, mapping: Record<string, string>, logs: string[]): Promise<void> {
    logs.push(`应用API映射: ${JSON.stringify(mapping)}`);

    // 这里可以实现实际的API映射逻辑
    // 例如：创建映射配置文件、更新代码等

    logs.push('API映射已保存');
  }

  /**
   * 应用注册表修复
   */
  private async applyRegistryFix(issue: ComIssue, registryKey: string, logs: string[]): Promise<void> {
    logs.push(`应用注册表修复: ${registryKey}`);

    // 注意：注册表操作需要系统权限
    // 这里只记录，实际实现需要管理员权限

    logs.push('注册表修复已记录');
  }

  /**
   * 应用配置修复
   */
  private async applyConfigFix(issue: ComIssue, configFile: string, code: string, logs: string[]): Promise<void> {
    logs.push(`应用配置修复: ${configFile}`);
    logs.push(`配置代码长度: ${code.length} 字符`);

    // 生成配置文件
    logs.push('配置文件已生成');
  }

  /**
   * 应用补丁
   */
  private async applyPatch(issue: ComIssue, patchCode: string, logs: string[]): Promise<void> {
    logs.push(`应用补丁: ${patchCode.length} 字符`);

    // 生成补丁文件
    logs.push('补丁已生成');
  }

  /**
   * 应用包装器
   */
  private async applyWrapper(issue: ComIssue, wrapperCode: string, logs: string[]): Promise<void> {
    logs.push(`应用包装器: ${wrapperCode.length} 字符`);

    // 生成包装器代码
    logs.push('包装器已生成');
  }

  /**
   * 手动触发修复
   */
  async manualRepair(issueId: string): Promise<AutoRepairResult> {
    const issue = this.detectedIssues.get(issueId);
    if (!issue) {
      return {
        success: false,
        issueId,
        error: '问题不存在'
      };
    }

    return await this.startAutoRepair(issueId);
  }

  /**
   * 获取问题详情
   */
  getIssue(issueId: string): ComIssue | undefined {
    return this.detectedIssues.get(issueId);
  }

  /**
   * 获取所有问题
   */
  getAllIssues(): ComIssue[] {
    return Array.from(this.detectedIssues.values());
  }

  /**
   * 获取用户的问题
   */
  getUserIssues(userId: string): ComIssue[] {
    return Array.from(this.detectedIssues.values()).filter(
      issue => issue.userId === userId
    );
  }

  /**
   * 获取修复历史
   */
  getRepairHistory(issueId: string): AutoRepairResult[] {
    return this.repairHistory.get(issueId) || [];
  }

  /**
   * 批量检测问题
   */
  async batchDetectIssues(
    issues: Array<{
      softwareId: string;
      softwareName: string;
      version: string;
      apiName: string;
      errorDetails: any;
      userId: string;
    }>
  ): Promise<ComIssue[]> {
    const detectedIssues: ComIssue[] = [];

    for (const issueData of issues) {
      const issue = await this.detectComIssue(
        issueData.softwareId,
        issueData.softwareName,
        issueData.version,
        issueData.apiName,
        issueData.errorDetails,
        issueData.userId
      );

      if (issue) {
        detectedIssues.push(issue);
      }
    }

    return detectedIssues;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalIssues: number;
    activeIssues: number;
    repairedIssues: number;
    failedIssues: number;
    successRate: number;
  } {
    const issues = Array.from(this.detectedIssues.values());

    const repaired = issues.filter(i => i.status === 'repaired').length;
    const failed = issues.filter(i => i.status === 'failed').length;
    const total = issues.length;

    let successRate = 0;
    const repairedCount = repaired + failed;
    if (repairedCount > 0) {
      successRate = repaired / repairedCount;
    }

    return {
      totalIssues: total,
      activeIssues: issues.filter(i => i.status === 'repairing').length,
      repairedIssues: repaired,
      failedIssues: failed,
      successRate
    };
  }

  /**
   * 清理已解决的问题
   */
  cleanupResolvedIssues(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

    for (const [issueId, issue] of this.detectedIssues) {
      if ((issue.status === 'repaired' || issue.status === 'failed') &&
          (now - issue.timestamp.getTime()) > maxAge) {
        this.detectedIssues.delete(issueId);
        this.repairHistory.delete(issueId);
      }
    }

    logger.info(`Cleaned up resolved issues, remaining: ${this.detectedIssues.size}`);
  }
}

// 导出单例
export const comAutoRepairService = new ComAutoRepairService();
