import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { scriptCategoryService } from '../services/scriptCategoryService';
import { logger } from '../utils/logger';

const router = express.Router();

// 创建脚本分类
router.post('/categories', authenticate, [
  body('name').notEmpty().withMessage('分类名称不能为空'),
  body('description').optional().isString(),
  body('parentId').optional().isString(),
  body('icon').optional().isString(),
  body('color').optional().isString().matches(/^#[0-9A-F]{6}$/i).withMessage('颜色格式不正确'),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await scriptCategoryService.createCategory(req.body);

    res.json({
      success: true,
      message: '脚本分类创建成功',
      data: category
    });
  } catch (error) {
    logger.error('创建脚本分类失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '创建分类失败'
    });
  }
});

// 更新脚本分类
router.put('/categories/:categoryId', authenticate, [
  body('name').optional().isString().withMessage('分类名称格式不正确'),
  body('description').optional().isString(),
  body('icon').optional().isString(),
  body('color').optional().isString().matches(/^#[0-9A-F]{6}$/i).withMessage('颜色格式不正确'),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { categoryId } = req.params;
    const category = await scriptCategoryService.updateCategory(categoryId, req.body);

    res.json({
      success: true,
      message: '脚本分类更新成功',
      data: category
    });
  } catch (error) {
    logger.error('更新脚本分类失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '更新分类失败'
    });
  }
});

// 删除脚本分类
router.delete('/categories/:categoryId', authenticate, [
  query('deleteScripts').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { deleteScripts = false } = req.query;

    await scriptCategoryService.deleteCategory(categoryId);

    res.json({
      success: true,
      message: deleteScripts ? '分类及其脚本已删除' : '分类已删除'
    });
  } catch (error) {
    logger.error('删除脚本分类失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '删除分类失败'
    });
  }
});

// 获取分类树
router.get('/categories/tree', authenticate, [
  query('includeInactive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const categoryTree = await scriptCategoryService.getCategoryTree();

    res.json({
      success: true,
      data: categoryTree
    });
  } catch (error) {
    logger.error('获取分类树失败:', error);
    res.status(500).json({
      error: '获取分类树失败'
    });
  }
});

// 获取分类列表
router.get('/categories', authenticate, [
  query('parentId').optional().isString(),
  query('includeInactive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    const {
      parentId,
      includeInactive = false,
      page = 1,
      limit = 100
    } = req.query;

    const result = await scriptCategoryService.getCategoryList({
      parentId: parentId as string,
      includeInactive: includeInactive === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({
      error: '获取分类列表失败'
    });
  }
});

// 获取分类详情
router.get('/categories/:categoryId', authenticate, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const category = await scriptCategoryService.getCategory(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('获取分类详情失败:', error);
    res.status(500).json({
      error: '获取分类详情失败'
    });
  }
});

// 搜索分类
router.get('/categories/search', authenticate, [
  query('keyword').notEmpty().withMessage('搜索关键词不能为空'),
  query('includeInactive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { keyword, limit, includeInactive = false } = req.query;
    const categories = await scriptCategoryService.searchCategories(
      keyword as string,
      { limit: limit ? Number(limit) : undefined }
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('搜索分类失败:', error);
    res.status(500).json({
      error: '搜索分类失败'
    });
  }
});

// 移动分类
router.patch('/categories/:categoryId/move', authenticate, [
  body('newParentId').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { categoryId } = req.params;
    const { newParentId } = req.body;

    const category = await scriptCategoryService.moveCategory(
      categoryId,
      newParentId as string
    );

    res.json({
      success: true,
      message: '分类移动成功',
      data: category
    });
  } catch (error) {
    logger.error('移动分类失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '移动分类失败'
    });
  }
});

// 批量更新排序
router.put('/categories/sort-order', authenticate, [
  body('updates').isArray({ min: 1 }).withMessage('更新数据不能为空'),
  body('updates.*.categoryId').notEmpty().withMessage('分类ID不能为空'),
  body('updates.*.sortOrder').isInt({ min: 0 }).withMessage('排序值必须是非负整数')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { updates } = req.body;
    await scriptCategoryService.updateSortOrder(updates);

    res.json({
      success: true,
      message: `成功更新${updates.length}个分类的排序`
    });
  } catch (error) {
    logger.error('批量更新排序失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '批量更新排序失败'
    });
  }
});

// 获取分类统计
router.get('/categories/stats', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const stats = await scriptCategoryService.getCategoryStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取分类统计失败:', error);
    res.status(500).json({
      error: '获取分类统计失败'
    });
  }
});

// 初始化默认分类
router.post('/categories/initialize', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    await scriptCategoryService.initializeDefaultCategories();

    res.json({
      success: true,
      message: '默认分类初始化成功'
    });
  } catch (error) {
    logger.error('初始化默认分类失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '初始化失败'
    });
  }
});

// 获取分类选择器数据（用于前端下拉选择）
router.get('/categories/selector', authenticate, [
  query('includeInactive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const categoryTree = await scriptCategoryService.getCategoryTree();

    // 转换为选择器友好的格式
    const selectorData = flattenCategoryTree(categoryTree);

    res.json({
      success: true,
      data: selectorData
    });
  } catch (error) {
    logger.error('获取分类选择器数据失败:', error);
    res.status(500).json({
      error: '获取选择器数据失败'
    });
  }
});

// 将分类树展平为选择器格式
function flattenCategoryTree(
  categories: any[],
  level: number = 0,
  prefix: string = ''
): Array<{
  value: string;
  label: string;
  level: number;
  icon?: string;
  color?: string;
  disabled?: boolean;
}> {
  const result: any[] = [];
  for (const category of categories) {
    const label = prefix + category.name;
    result.push({
      value: category.id,
      label,
      level,
      icon: category.icon,
      color: category.color,
      disabled: !category.isActive
    });

    if (category.children && category.children.length > 0) {
      const childPrefix = prefix + '  ';
      result.push(...flattenCategoryTree(category.children, level + 1, childPrefix));
    }
  }
  return result;
}

export default router;
