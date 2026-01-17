import { Router, Request, Response } from 'express';
import { ScriptExecutor } from '../services/scriptExecutor';
import { ScriptService } from '../services/scriptService';
import { logger } from '../utils/logger';

const router = Router();
const scriptExecutor = new ScriptExecutor();
const scriptService = new ScriptService();

/**
 * 获取脚本列表
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await scriptService.getUserScripts(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('获取脚本列表失败:', error);
    res.status(500).json({ success: false, message: '获取脚本列表失败' });
  }
});

/**
 * 获取脚本详情
 */
router.get('/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    const script = await scriptService.getScriptById(scriptId);

    if (!script) {
      return res.status(404).json({ success: false, message: '脚本不存在' });
    }

    res.json({ success: true, data: script });
  } catch (error) {
    logger.error('获取脚本详情失败:', error);
    res.status(500).json({ success: false, message: '获取脚本详情失败' });
  }
});

/**
 * 创建脚本
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { name, description, code, language, category, tags, version } = req.body;

    const scriptDefinition = {
      name,
      description,
      code,
      language,
      category,
      tags,
      version
    };

    const script = await scriptService.createScript(userId, scriptDefinition);
    res.json({ success: true, data: script });
  } catch (error) {
    logger.error('创建脚本失败:', error);
    res.status(500).json({ success: false, message: '创建脚本失败' });
  }
});

/**
 * 删除脚本
 */
router.delete('/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    await scriptService.deleteScript(scriptId);
    res.json({ success: true, message: '脚本删除成功' });
  } catch (error) {
    logger.error('删除脚本失败:', error);
    res.status(500).json({ success: false, message: '删除脚本失败' });
  }
});

/**
 * 执行脚本
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { script, params, timeout } = req.body;

    const result = await scriptExecutor.execute(script, params, { timeout });

    res.json(result);
  } catch (error) {
    logger.error('执行脚本失败:', error);
    res.status(500).json({ success: false, message: '执行脚本失败' });
  }
});

/**
 * 执行TypeScript脚本
 */
router.post('/execute-typescript', async (req: Request, res: Response) => {
  try {
    const { code, params } = req.body;

    const result = await scriptExecutor.executeTypeScript(code, params);

    res.json(result);
  } catch (error) {
    logger.error('执行TypeScript脚本失败:', error);
    res.status(500).json({ success: false, message: '执行TypeScript脚本失败' });
  }
});

/**
 * 执行Python脚本
 */
router.post('/execute-python', async (req: Request, res: Response) => {
  try {
    const { code, params, timeout } = req.body;

    const result = await scriptExecutor.executePython(code, params, { timeout });

    res.json(result);
  } catch (error) {
    logger.error('执行Python脚本失败:', error);
    res.status(500).json({ success: false, message: '执行Python脚本失败' });
  }
});

/**
 * 验证脚本安全性
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body;

    const result = await scriptExecutor.validateScript(code, language);

    res.json(result);
  } catch (error) {
    logger.error('验证脚本安全性失败:', error);
    res.status(500).json({ success: false, message: '验证脚本安全性失败' });
  }
});

/**
 * 获取脚本执行历史
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await scriptExecutor.getExecutionHistory(limit);

    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('获取脚本执行历史失败:', error);
    res.status(500).json({ success: false, message: '获取脚本执行历史失败' });
  }
});

/**
 * 停止脚本执行
 */
router.post('/stop/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    const result = await scriptExecutor.stopExecution(executionId);

    res.json(result);
  } catch (error) {
    logger.error('停止脚本执行失败:', error);
    res.status(500).json({ success: false, message: '停止脚本执行失败' });
  }
});

export default router;
