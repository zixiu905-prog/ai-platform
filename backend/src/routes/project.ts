import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

// 获取项目列表
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, status, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = userId ? { userId } : {};

    // 筛选条件
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.projects.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true }
          },
          workflows: {
            include: {
              workflow: {
                select: { id: true, name: true, isActive: true }
              }
            }
          },
          scripts: {
            include: {
              script: {
                select: { id: true, name: true, isActive: true }
              }
            }
          },
          assets: {
            select: { id: true, name: true, type: true, size: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.projects.count({ where })
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('获取项目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败'
    });
  }
});

// 获取单个项目详情
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const project = await prisma.projects.findFirst({
      where: {
        id,
        ...(userId ? { userId: userId } : {})
      },
      include: {
        user: {
          select: { id: true, username: true, email: true }
        },
        workflows: {
          include: {
            workflow: {
              include: {
                users: {
                  select: { username: true }
                }
              }
            }
          }
        },
        scripts: {
          include: {
            script: {
              include: {
                users: {
                  select: { username: true }
                }
              }
            }
          }
        },
        assets: {
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          include: {
            user: {
              select: { username: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('获取项目详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败'
    });
  }
});

// 创建项目
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      name,
      description,
      type,
      path,
      settings,
      metadata,
      tags,
      priority,
      deadline
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '项目名称不能为空'
      });
    }

    const project = await prisma.projects.create({
      data: {
        name,
        description,
        userId,
        metadata: metadata || {}
      },
      include: {
        user: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // 记录活动
    await prisma.project_activities.create({
      data: {
        projectId: project.id,
        userId,
        action: 'created',
        details: { projectName: name }
      }
    });

    logger.info(`用户 ${userId} 创建了项目: ${name}`);

    res.status(201).json({
      success: true,
      data: project,
      message: '项目创建成功'
    });
  } catch (error) {
    logger.error('创建项目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
});

// 更新项目
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const {
      name,
      description,
      type,
      status,
      path,
      settings,
      metadata,
      tags,
      priority,
      deadline,
      progress
    } = req.body;

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.projects.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权限访问'
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (path !== undefined) updateData.path = path;
    if (settings !== undefined) updateData.settings = settings;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (progress !== undefined) updateData.progress = progress;

    const project = await prisma.projects.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // 记录活动
    await prisma.project_activities.create({
      data: {
        projectId: id,
        userId,
        action: 'updated',
        details: updateData
      }
    });

    logger.info(`用户 ${userId} 更新了项目: ${project.name}`);

    res.json({
      success: true,
      data: project,
      message: '项目更新成功'
    });
  } catch (error) {
    logger.error('更新项目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新项目失败'
    });
  }
});

// 删除项目
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.projects.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权限访问'
      });
    }

    await prisma.projects.delete({
      where: { id }
    });

    logger.info(`用户 ${userId} 删除了项目: ${existingProject.name}`);

    res.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    logger.error('删除项目失败:', error);
    res.status(500).json({
      success: false,
      message: '删除项目失败'
    });
  }
});

// 获取项目统计信息
router.get('/:id/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // 检查项目是否存在且属于当前用户
    const project = await prisma.projects.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权限访问'
      });
    }

    const [
      workflowCount,
      scriptCount,
      assetCount,
      recentActivities
    ] = await Promise.all([
      prisma.project_workflows.count({
        where: { projectId: id }
      }),
      prisma.project_scripts.count({
        where: { projectId: id }
      }),
      prisma.project_assets.count({
        where: { projectId: id }
      }),
      prisma.project_activities.count({
        where: {
          projectId: id,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
          }
        }
      })
    ]);

    const stats = {
      workflows: workflowCount,
      scripts: scriptCount,
      assets: assetCount,
      recentActivities,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取项目统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目统计失败'
    });
  }
});

// 添加工作流到项目
router.post('/:id/workflows', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workflowId, role = 'main' } = req.body;
    const userId = (req as any).user?.id;

    // 检查项目是否存在且属于当前用户
    const project = await prisma.projects.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权限访问'
      });
    }

    // 检查工作流是否存在
    const workflow = await prisma.workflows.findUnique({
      where: { id: workflowId }
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '工作流不存在'
      });
    }

    const projectWorkflow = await prisma.project_workflows.create({
      data: {
        projectId: id,
        workflowId
      }
    });

    // 记录活动
    await prisma.project_activities.create({
      data: {
        projectId: id,
        userId,
        action: 'added_workflow',
        details: { workflowName: workflow.name }
      }
    });

    res.status(201).json({
      success: true,
      data: projectWorkflow,
      message: '工作流添加成功'
    });
  } catch (error) {
    logger.error('添加工作流到项目失败:', error);
    res.status(500).json({
      success: false,
      message: '添加工作流到项目失败'
    });
  }
});

// 添加脚本到项目
router.post('/:id/scripts', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scriptId, role = 'main' } = req.body;
    const userId = (req as any).user?.id;

    // 检查项目是否存在且属于当前用户
    const project = await prisma.projects.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权限访问'
      });
    }

    // 检查脚本是否存在
    const script = await prisma.scripts.findUnique({
      where: { id: scriptId }
    });

    if (!script) {
      return res.status(404).json({
        success: false,
        message: '脚本不存在'
      });
    }

    const projectScript = await prisma.project_scripts.create({
      data: {
        projectId: id,
        scriptId,
        name: script.name
      }
    });

    // 记录活动
    await prisma.project_activities.create({
      data: {
        projectId: id,
        userId,
        action: 'added_script',
        details: { scriptName: script.name }
      }
    });

    res.status(201).json({
      success: true,
      data: projectScript,
      message: '脚本添加成功'
    });
  } catch (error) {
    logger.error('添加脚本到项目失败:', error);
    res.status(500).json({
      success: false,
      message: '添加脚本到项目失败'
    });
  }
});

export default router;
