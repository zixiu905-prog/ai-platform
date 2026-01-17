import express from 'express';
import { prisma } from '../config/database';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(authenticate);

// 脚本模板库
const SCRIPT_TEMPLATES: Record<string, any> = {
  'photoshop-batch-resize': {
    name: 'Photoshop 批量调整尺寸',
    description: '批量调整图像尺寸并保持质量',
    category: 'image',
    software: 'photoshop',
    language: 'javascript',
    template: `function resizeImages(inputFolder, outputFolder, width, height) {
  // 获取输入文件夹中的所有图像文件
  const files = Folder(inputFolder).getFiles();

  files.forEach(file => {
    if (file.isImage()) {
      // 打开图像
      const doc = app.open(file);

      // 调整尺寸
      doc.resizeImage(UnitValue(width, 'px'), UnitValue(height, 'px'), null, ResampleMethod.BICUBICSHARPER);

      // 保存到输出文件夹
      const outputFile = new File(outputFolder, file.name);
      doc.saveAs(outputFile);
      doc.close();
    }
  });

  return {
    success: true,
    processed: files.length,
    output: outputFolder
  };
}`,
    parameters: [
      { name: 'inputFolder', type: 'folder', required: true, description: '输入文件夹路径' },
      { name: 'outputFolder', type: 'folder', required: true, description: '输出文件夹路径' },
      { name: 'width', type: 'number', required: true, description: '目标宽度(像素)', defaultValue: 800 },
      { name: 'height', type: 'number', required: true, description: '目标高度(像素)', defaultValue: 600 }
    ]
  },
  'autocad-layer-cleanup': {
    name: 'AutoCAD 图层清理',
    description: '清理CAD文件中的无用图层和对象',
    category: 'cad',
    software: 'autocad',
    language: 'lisp',
    template: `(defun cleanupLayers (/ layerCount cleanedLayers)
  (setq layerCount 0)
  (setq cleanedLayers 0)

  ;; 遍历所有图层
  (vlax-for layer (vla-get-layers (vla-get-activedocument (vlax-get-acad-object)))
    (setq layerCount (1+ layerCount))

    ;; 检查图层是否为空
    (if (and
          (not (vla-get-layeron layer))
          (not (vla-get-lock layer))
          (= (vla-get-name layer) "0")
         )
      (progn
        (vla-delete layer)
        (setq cleanedLayers (1+ cleanedLayers))
      )
    )
  )

  (list (cons 'totalLayers layerCount)
        (cons 'cleanedLayers cleanedLayers)
        (cons 'success T)
  )
)`,
    parameters: [
      { name: 'removeEmptyLayers', type: 'boolean', required: false, description: '删除空图层', defaultValue: true },
      { name: 'removeZeroObjects', type: 'boolean', required: false, description: '删除零长度对象', defaultValue: true }
    ]
  },
  'blender-render-batch': {
    name: 'Blender 批量渲染',
    description: '批量渲染Blender场景文件',
    category: '3d',
    software: 'blender',
    language: 'python',
    template: `import bpy
import os

def render_scenes(input_folder, output_folder, resolution_x, resolution_y):
    """批量渲染Blender场景文件"""
    rendered_files = []

    # 遍历文件夹中的.blend文件
    for filename in os.listdir(input_folder):
      if filename.endswith('.blend'):
        filepath = os.path.join(input_folder, filename)

        # 打开场景文件
        bpy.ops.wm.open_mainfile(filepath=filepath)

        # 设置渲染参数
        bpy.context.scene.render.resolution_x = resolution_x
        bpy.context.scene.render.resolution_y = resolution_y
        bpy.context.scene.render.filepath = os.path.join(output_folder, filename.replace('.blend', ''))

        # 渲染场景
        bpy.ops.render.render(write_still=True)

        rendered_files.append(filename)

    return {
      'success': True,
      'rendered_files': rendered_files,
      'output_folder': output_folder
    }`,
    parameters: [
      { name: 'input_folder', type: 'folder', required: true, description: '输入文件夹路径' },
      { name: 'output_folder', type: 'folder', required: true, description: '输出文件夹路径' },
      { name: 'resolution_x', type: 'number', required: true, description: '渲染宽度', defaultValue: 1920 },
      { name: 'resolution_y', type: 'number', required: true, description: '渲染高度', defaultValue: 1080 }
    ]
  }
};

/**
 * @route GET /api/scripts
 * @desc 获取脚本列表
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, category, software } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = userId ? { authorId: userId } : {};

    if (category) where.category = category as string;
    if (software) {
      // 需要根据软件名称查找softwareId
      const softwareApi = await prisma.software_apis.findUnique({
        where: { softwareName: software as string }
      });
      if (softwareApi) {
        where.softwareId = softwareApi.id;
      }
    }

    const [scripts, total] = await Promise.all([
      prisma.scripts.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.scripts.count({ where })
    ]);

    res.json({
      success: true,
      message: '获取脚本列表成功',
      data: {
        scripts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    logger.error('获取脚本列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取脚本列表失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/scripts/templates
 * @desc 获取脚本模板
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { category, software } = req.query;

    let templates = Object.entries(SCRIPT_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      software: template.software,
      language: template.language,
      parameterCount: template.parameters.length,
      complexity: template.parameters.length > 4 ? 'advanced' : template.parameters.length > 2 ? 'intermediate' : 'beginner'
    }));

    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    if (software) {
      templates = templates.filter(t => t.software === software);
    }

    res.json({
      success: true,
      message: '获取脚本模板成功',
      data: { templates }
    });
  } catch (error) {
    logger.error('获取脚本模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取脚本模板失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/scripts/templates/:id
 * @desc 获取特定脚本模板
 * @access Private
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = SCRIPT_TEMPLATES[id];

    if (!template) {
      return res.status(404).json({
        success: false,
        message: '脚本模板不存在',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: '获取脚本模板成功',
      data: {
        id,
        ...template
      }
    });
  } catch (error) {
    logger.error('获取脚本模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取脚本模板失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/scripts
 * @desc 创建脚本
 * @access Private
 */
router.post('/', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, category, software, language, code, parameters } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: '脚本名称和代码不能为空',
        timestamp: new Date().toISOString()
      });
    }

    const script = await prisma.scripts.create({
      data: {
        authorId: userId,
        name,
        description: description || '',
        category: category || 'custom',
        softwareId: software || 'generic',
        content: code,
        parameters: parameters || [],
        version: '1.0.0',
        isActive: false
      }
    } as any);

    logger.info(`用户 ${userId} 创建脚本: ${name}`);

    res.json({
      success: true,
      message: '创建脚本成功',
      data: script
    });
  } catch (error) {
    logger.error('创建脚本失败:', error);
    res.status(500).json({
      success: false,
      message: '创建脚本失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/scripts/:id/execute
 * @desc 执行脚本
 * @access Private
 */
router.post('/:id/execute', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { parameters } = req.body;

    // 获取脚本
    const script = await prisma.scripts.findUnique({
      where: {
        id
      }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: '脚本不存在',
        timestamp: new Date().toISOString()
      });
    }

    if (!script.isActive) {
      return res.status(400).json({
        success: false,
        message: '只有激活状态的脚本才能执行',
        timestamp: new Date().toISOString()
      });
    }

    // 创建执行记录
    const execution = await prisma.task_executions.create({
      data: {
        scriptId: id,
        userId,
        input: parameters || {},
        status: 'RUNNING',
        startedAt: new Date()
      }
    } as any);

    // 模拟脚本执行
    setTimeout(async () => {
      try {
        const result = {
          success: true,
          output: `脚本 "${script.name}" 执行成功`,
          processedItems: Math.floor(Math.random() * 100) + 1,
          duration: Math.floor(Math.random() * 10000) + 2000,
          logs: [
            '开始执行脚本...',
            `处理参数: ${JSON.stringify(parameters)}`,
            '脚本执行中...',
            '执行完成'
          ]
        };

        await prisma.task_executions.update({
          where: {
            id: execution.id
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: result
          }
        });

        logger.info(`脚本执行完成: ${id}, 执行ID: ${execution.id}`);
      } catch (error) {
        await prisma.task_executions.update({
          where: {
            id: execution.id
          },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : '未知错误'
          }
        });

        logger.error(`脚本执行失败: ${id}, 执行ID: ${execution.id}`, error);
      }
    }, 3000);

    res.json({
      success: true,
      message: '脚本执行已启动',
      data: execution
    });
  } catch (error) {
    logger.error('执行脚本失败:', error);
    res.status(500).json({
      success: false,
      message: '执行脚本失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/scripts/:id/executions
 * @desc 获取脚本执行历史
 * @access Private
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // 验证脚本归属
    const script = await prisma.scripts.findUnique({
      where: {
        id
      }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: '脚本不存在',
        timestamp: new Date().toISOString()
      });
    }

    const [executions, total] = await Promise.all([
      prisma.task_executions.findMany({
        where: {
          scriptId: id
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task_executions.count({
        where: { scriptId: id }
      })
    ]);

    res.json({
      success: true,
      message: '获取执行历史成功',
      data: {
        executions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    logger.error('获取脚本执行历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取脚本执行历史失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/scripts/:id
 * @desc 更新脚本
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, category, software, language, code, parameters, status } = req.body;

    const script = await prisma.scripts.findUnique({
      where: {
        id
      }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: '脚本不存在',
        timestamp: new Date().toISOString()
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (software !== undefined) updateData.software = software;
    if (language !== undefined) updateData.language = language;
    if (code !== undefined) {
      updateData.code = code;
      updateData.version = script.version + 1;
    }
    if (parameters !== undefined) updateData.parameters = parameters;
    if (status !== undefined) updateData.status = status;

    const updatedScript = await prisma.scripts.update({
      where: { id },
      data: updateData
    });

    logger.info(`用户 ${userId} 更新脚本: ${id}`);

    res.json({
      success: true,
      message: '更新脚本成功',
      data: updatedScript
    });
  } catch (error) {
    logger.error('更新脚本失败:', error);
    res.status(500).json({
      success: false,
      message: '更新脚本失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route DELETE /api/scripts/:id
 * @desc 删除脚本
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const script = await prisma.scripts.findUnique({
      where: {
        id
      }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: '脚本不存在',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.scripts.delete({
      where: { id }
    });

    logger.info(`用户 ${userId} 删除脚本: ${id}`);

    res.json({
      success: true,
      message: '删除脚本成功'
    });
  } catch (error) {
    logger.error('删除脚本失败:', error);
    res.status(500).json({
      success: false,
      message: '删除脚本失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/scripts/auto-categorize/:scriptId
 * @desc 自动分类单个脚本
 * @access Private
 */
router.post('/auto-categorize/:scriptId', requireSubscription('basic'), async (req, res) => {
  try {
    const { scriptId } = req.params;
    const userId = (req as any).user.id;

    // 验证脚本存在且用户有权限
    const script = await prisma.scripts.findUnique({
      where: { id: scriptId }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        error: '脚本不存在',
        message: '指定的脚本不存在'
      });
    }

    if (script.authorId !== userId && !(req as any).user.role.includes('ADMIN')) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '您只能分类自己的脚本'
      });
    }

    // 执行自动分类
    const { scriptCategoryService } = await import('../services/scriptCategoryService');
    const result = await scriptCategoryService.autoCategorizeScript(scriptId);

    res.json({
      success: true,
      message: '脚本自动分类完成',
      data: {
        scriptId,
        scriptTitle: script.name,
        recommendedCategory: result.recommendedCategory,
        confidence: result.confidence,
        reasoning: result.reasoning,
        alternativeCategories: result.alternativeCategories,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('脚本自动分类失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '自动分类失败',
      message: '脚本自动分类失败'
    });
  }
});

/**
 * @route POST /api/scripts/auto-categorize/batch
 * @desc 批量自动分类脚本
 * @access Private
 */
router.post('/auto-categorize/batch', requireSubscription('pro'), async (req, res) => {
  try {
    const { scriptIds } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(scriptIds) || scriptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'scriptIds 必须是非空数组'
      });
    }

    if (scriptIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: '数量超限',
        message: '批量分类最多支持50个脚本'
      });
    }

    // 验证所有脚本都存在且用户有权限
    const scripts = await prisma.scripts.findMany({
      where: {
        id: { in: scriptIds },
        authorId: userId
      }
    });

    if (scripts.length !== scriptIds.length) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '部分脚本不存在或您没有权限'
      });
    }

    // 执行批量自动分类
    const { scriptCategoryService } = await import('../services/scriptCategoryService');
    const results = await scriptCategoryService.batchAutoCategorizeScripts(scriptIds);

    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `批量自动分类完成: ${successCount}个成功, ${failureCount}个失败`,
      data: {
        totalProcessed: results.length,
        successCount,
        failureCount,
        results: results.map((r: any) => ({
          scriptId: r.scriptId,
          success: r.success,
          error: r.error,
          result: r.success ? {
            recommendedCategory: r.result.recommendedCategory,
            confidence: r.result.confidence
          } : null
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('批量脚本自动分类失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量分类失败',
      message: '批量脚本自动分类失败'
    });
  }
});

/**
 * @route GET /api/scripts/category-statistics
 * @desc 获取脚本分类统计信息
 * @access Private
 */
router.get('/category-statistics', authenticate, async (req, res) => {
  try {
    const { scriptCategoryService } = await import('../services/scriptCategoryService');
    const statistics = await scriptCategoryService.getCategoryStatistics();

    res.json({
      success: true,
      message: '获取分类统计信息成功',
      data: statistics
    });

  } catch (error) {
    logger.error('获取分类统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取统计失败',
      message: '获取分类统计信息失败'
    });
  }
});

/**
 * @route POST /api/scripts/smart-categorize-all
 * @desc 智能重新分类所有未分类脚本（管理员功能）
 * @access Private (Admin only)
 */
router.post('/smart-categorize-all', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // 验证管理员权限
    const user = await prisma.users.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.role === 'USER') {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '只有管理员可以执行全局重新分类'
      });
    }

    // 获取所有未分类的脚本
    const uncategorizedScripts = await prisma.scripts.findMany({
      where: {
        OR: [
          { category: { equals: '' } },
          { category: { equals: 'uncategorized' } }
        ]
      },
      select: {
        id: true,
        name: true
      },
      take: 100 // 限制每次处理100个
    });

    if (uncategorizedScripts.length === 0) {
      return res.json({
        success: true,
        message: '没有需要分类的脚本',
        data: {
          processedCount: 0,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 执行批量分类
    const { scriptCategoryService } = await import('../services/scriptCategoryService');
    const scriptIds = uncategorizedScripts.map((s: any) => s.id);
    const results = await scriptCategoryService.batchAutoCategorizeScripts(scriptIds);

    const successCount = results.filter((r: any) => r.success).length;

    res.json({
      success: true,
      message: `全局重新分类完成: ${successCount}/${results.length} 个脚本成功分类`,
      data: {
        totalFound: uncategorizedScripts.length,
        processedCount: results.length,
        successCount,
        failureCount: results.length - successCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('全局脚本重新分类失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '全局分类失败',
      message: '全局脚本重新分类失败'
    });
  }
});

export default router;
