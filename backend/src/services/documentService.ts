import { PrismaClient, DocumentStatus, documents } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export interface CreateDocumentData {
  title: string;
  content: string;
  userId: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateDocumentData {
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
  status?: DocumentStatus;
}

export interface DocumentFilters {
  userId?: string;
  categoryId?: string;
  status?: DocumentStatus;
  isPublic?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class DocumentService {
  private prisma: PrismaClient;
  private uploadDir: string;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.uploadDir = './uploads/documents';
  }

  /**
   * 创建文档
   */
  async createDocument(data: CreateDocumentData): Promise<documents> {
    try {
      const document = await this.prisma.documents.create({
        data: {
          title: data.title,
          content: data.content,
          userId: data.userId,
          categoryId: data.categoryId,
          isPublic: data.isPublic ?? false,
          status: DocumentStatus.DRAFT
        }
      });

      logger.info(`文档创建成功: ${document.id}`);
      return document;
    } catch (error) {
      logger.error('创建文档失败:', error);
      throw new Error(`创建文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新文档
   */
  async updateDocument(id: string, data: UpdateDocumentData): Promise<documents> {
    try {
      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.content) updateData.content = data.content;
      if (data.categoryId) updateData.categoryId = data.categoryId;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.status) updateData.status = data.status;

      const document = await this.prisma.documents.update({
        where: { id },
        data: updateData
      });

      logger.info(`文档更新成功: ${id}`);
      return document;
    } catch (error) {
      logger.error('更新文档失败:', error);
      throw new Error(`更新文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.prisma.documents.delete({ where: { id } });
      logger.info(`文档删除成功: ${id}`);
    } catch (error) {
      logger.error('删除文档失败:', error);
      throw new Error(`删除文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文档详情
   */
  async getDocumentById(id: string): Promise<documents | null> {
    try {
      return await this.prisma.documents.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('获取文档详情失败:', error);
      return null;
    }
  }

  /**
   * 搜索文档
   */
  async searchDocuments(filters: DocumentFilters): Promise<{ documents: documents[]; total: number }> {
    try {
      const {
        userId,
        categoryId,
        status,
        isPublic,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (userId) where.userId = userId;
      if (categoryId) where.categoryId = categoryId;
      if (status) where.status = status;
      if (isPublic !== undefined) where.isPublic = isPublic;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [total, documents] = await Promise.all([
        this.prisma.documents.count({ where }),
        this.prisma.documents.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        })
      ]);

      return { documents, total };
    } catch (error) {
      logger.error('搜索文档失败:', error);
      throw new Error(`搜索文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文档统计
   */
  async getDocumentStats(userId?: string): Promise<{
    total: number;
    byStatus: Record<DocumentStatus, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const where = userId ? { userId } : {};

      const [total, byStatusRaw, byCategoryRaw] = await Promise.all([
        this.prisma.documents.count({ where }),
        this.prisma.documents.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.documents.groupBy({
          by: ['categoryId'],
          where,
          _count: true
        })
      ]);

      const byStatus: Record<string, number> = {};
      for (const item of byStatusRaw) {
        byStatus[item.status] = item._count;
      }

      const byCategory: Record<string, number> = {};
      for (const item of byCategoryRaw) {
        byCategory[item.categoryId || 'uncategorized'] = item._count;
      }

      return { total, byStatus: byStatus as Record<DocumentStatus, number>, byCategory };
    } catch (error) {
      logger.error('获取文档统计失败:', error);
      throw new Error(`获取文档统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析文档
   */
  async parseDocument(
    documentId: string,
    options?: {
      extractText?: boolean;
      extractMetadata?: boolean;
      customParser?: string;
    }
  ): Promise<{
    success: boolean;
    content?: string;
    text?: string;
    metadata?: Record<string, any>;
    processingTime?: number;
    pageCount?: number;
    fileSize?: number;
    mimeType?: string;
    error?: string;
  }> {
    try {
      const document = await this.prisma.documents.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        return {
          success: false,
          error: '文档不存在'
        };
      }

      if (!document.filePath) {
        return {
          success: false,
          error: '文档文件不存在'
        };
      }

      const filePath = path.join(this.uploadDir, document.filePath || '');

      if (!(await this.fileExists(filePath))) {
        return {
          success: false,
          error: '文档文件不存在'
        };
      }

      const result: any = {
        success: true
      };

      // 根据文件类型解析
      if (options?.extractText) {
        result.text = await this.extractTextFromFile(filePath, document.fileType || undefined);
      }

      if (options?.extractMetadata) {
        result.metadata = await this.extractMetadata(filePath, document.fileType || undefined);
      }

      // 更新文档状态
      await this.prisma.documents.update({
        where: { id: documentId },
        data: {
          parseStatus: 'COMPLETED',
          parsedData: result
        }
      });

      return result;
    } catch (error) {
      logger.error(`解析文档失败 ${documentId}`, error);

      // 更新错误状态
      await this.prisma.documents.update({
        where: { id: documentId },
        data: {
          parseStatus: 'FAILED',
          parsedData: {
            error: error instanceof Error ? error.message : '未知错误'
          }
        }
      }).catch(() => {});

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 保存解析历史
   */
  async saveParseHistory(
    documentId: string,
    parseResult: any,
    options?: {
      parser?: string;
      version?: string;
    }
  ): Promise<void> {
    try {
      const document = await this.prisma.documents.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('文档不存在');
      }

      // 将解析历史保存在metadata中
      const metadata = (document.metadata as any) || {};
      const history: any[] = metadata.history || [];

      history.push({
        timestamp: new Date().toISOString(),
        parser: options?.parser || 'default',
        version: options?.version || '1.0.0',
        result: {
          success: parseResult.success,
          text: parseResult.text ? parseResult.text.substring(0, 100) + '...' : null,
          metadata: parseResult.metadata
        }
      });

      // 限制历史记录数量（最多50条）
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      await this.prisma.documents.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...metadata,
            history
          }
        }
      });

      logger.info(`解析历史保存成功: ${documentId}`);
    } catch (error) {
      logger.error(`保存解析历史失败 ${documentId}`, error);
      throw error;
    }
  }

  /**
   * 获取支持的文档格式
   */
  getSupportedFormats(): {
    category: string;
    formats: string[];
    extensions: string[];
  }[] {
    return [
      {
        category: 'PDF',
        formats: ['application/pdf'],
        extensions: ['.pdf']
      },
      {
        category: 'Word',
        formats: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        extensions: ['.doc', '.docx']
      },
      {
        category: 'Excel',
        formats: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        extensions: ['.xls', '.xlsx']
      },
      {
        category: 'PowerPoint',
        formats: [
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        extensions: ['.ppt', '.pptx']
      },
      {
        category: 'Plain Text',
        formats: ['text/plain'],
        extensions: ['.txt', '.text', '.md', '.csv']
      },
      {
        category: 'Images',
        formats: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/svg+xml'
        ],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg']
      }
    ];
  }

  /**
   * 获取用户文档解析历史列表
   */
  async getUserParseHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    documents: Array<{
      id: string;
      title: string;
      fileType: string;
      parseStatus: string;
      parsedAt?: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [documents, total] = await Promise.all([
        this.prisma.documents.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            fileType: true,
            parseStatus: true,
            updatedAt: true
          }
        }),
        this.prisma.documents.count({ where: { userId } })
      ]);

      return {
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType || '',
          parseStatus: doc.parseStatus || '',
          parsedAt: doc.updatedAt
        })),
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('获取用户解析历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档解析历史
   */
  async getParseHistory(documentId: string): Promise<{
    documentId: string;
    history: Array<{
      timestamp: string;
      parser: string;
      version: string;
      result: any;
    }>;
  }> {
    try {
      const document = await this.prisma.documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          metadata: true
        }
      });

      if (!document) {
        throw new Error('文档不存在');
      }

      const metadata = (document.metadata as any) || {};
      const history = metadata.history || [];

      return {
        documentId,
        history
      };
    } catch (error) {
      logger.error(`获取解析历史失败 ${documentId}`, error);
      throw error;
    }
  }

  /**
   * 从文件提取文本
   */
  private async extractTextFromFile(filePath: string, fileType?: string): Promise<string> {
    try {
      if (fileType?.includes('pdf')) {
        // PDF文件处理
        return await this.extractTextFromPDF(filePath);
      } else if (fileType?.includes('word') || fileType?.includes('doc')) {
        // Word文件处理
        return await this.extractTextFromWord(filePath);
      } else if (fileType?.includes('text') || fileType?.includes('plain')) {
        // 纯文本文件
        return await fs.readFile(filePath, 'utf-8');
      } else {
        // 默认尝试读取为文本
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch (error) {
      logger.error('提取文本失败', error);
      throw error;
    }
  }

  /**
   * 从PDF提取文本（简化版）
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    // 实际项目中应该使用 pdf-parse 库
    // 这里返回一个占位符
    logger.warn('PDF文本提取未完全实现');
    return '[PDF内容提取需要额外配置]';
  }

  /**
   * 从Word提取文本（简化版）
   */
  private async extractTextFromWord(filePath: string): Promise<string> {
    // 实际项目中应该使用 mammoth 库
    // 这里返回一个占位符
    logger.warn('Word文本提取未完全实现');
    return '[Word内容提取需要额外配置]';
  }

  /**
   * 提取文件元数据
   */
  private async extractMetadata(filePath: string, fileType?: string): Promise<Record<string, any>> {
    try {
      const stats = await fs.stat(filePath);

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        fileType: fileType || 'unknown'
      };
    } catch (error) {
      logger.error('提取元数据失败', error);
      return {};
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const documentService = new DocumentService();
