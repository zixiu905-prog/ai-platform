import React, { useState, useEffect } from 'react';
import { Conversation } from '../../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Download, Trash2, Calendar, MessageSquare, Bot } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { Button } from '../ui/button';

interface ConversationHistoryProps {
  conversations: Conversation[];
  onExportConversation?: (conversationId: string, format: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onSelectConversation?: (conversationId: string) => void;
}

export function ConversationHistory({ 
  conversations, 
  onExportConversation, 
  onDeleteConversation,
  onSelectConversation 
}: ConversationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'messageCount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 过滤和排序对话
  const filteredAndSortedConversations = conversations
    .filter(conv => 
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'messageCount':
          comparison = a.messages.length - b.messages.length;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSelectConversation = (conversationId: string) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedConversations.length === filteredAndSortedConversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(filteredAndSortedConversations.map(conv => conv.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedConversations.length === 0) return;
    
    if (window.confirm(`确定要删除选中的 ${selectedConversations.length} 个对话吗？`)) {
      for (const conversationId of selectedConversations) {
        await onDeleteConversation?.(conversationId);
      }
      setSelectedConversations([]);
    }
  };

  const handleBatchExport = async (format: string) => {
    if (selectedConversations.length === 0) return;
    
    for (const conversationId of selectedConversations) {
      await onExportConversation?.(conversationId, format);
    }
  };

  const getTotalStats = () => {
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const totalTokens = conversations.reduce((sum, conv) => 
      sum + conv.messages.reduce((msgSum, msg) => msgSum + (msg.metadata?.tokens || 0), 0), 0
    );
    return { conversations: conversations.length, messages: totalMessages, tokens: totalTokens };
  };

  const stats = getTotalStats();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 头部统计 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">对话历史管理</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.conversations}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">对话数量</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <Bot className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.messages}</div>
            <div className="text-xs text-green-600 dark:text-green-400">消息总数</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.tokens}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Token使用</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="p-4 border-b space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索对话标题或内容..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 排序选项 */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">按时间排序</option>
            <option value="title">按标题排序</option>
            <option value="messageCount">按消息数排序</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            {sortOrder === 'asc' ? '升序' : '降序'}
          </button>
        </div>

        {/* 批量操作 */}
        {selectedConversations.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-blue-600 dark:text-blue-400">
              已选择 {selectedConversations.length} 个对话
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchExport('json')}
              >
                <Download size={14} className="mr-1" />
                导出
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
              >
                <Trash2 size={14} className="mr-1" />
                删除
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare size={48} className="mb-2" />
            <p>{searchTerm ? '没有找到匹配的对话' : '暂无对话记录'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {/* 全选 */}
            <div className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedConversations.length === filteredAndSortedConversations.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="text-sm font-medium">全选</span>
            </div>
            
            {/* 对话项 */}
            {filteredAndSortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedConversations.includes(conversation.id)}
                  onChange={() => toggleSelectConversation(conversation.id)}
                  className="mt-1 rounded"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => onSelectConversation?.(conversation.id)}
                      >
                        {conversation.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {conversation.messages.length > 0 
                          ? conversation.messages[conversation.messages.length - 1].content
                          : '暂无消息'
                        }
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{conversation.messages.length} 条消息</span>
                        <span>
                          {formatDistanceToNow(conversation.updatedAt, {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                        {conversation.metadata?.totalTokens && (
                          <span>{conversation.metadata.totalTokens} tokens</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onExportConversation?.(conversation.id, 'json')}
                      >
                        <Download size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteConversation?.(conversation.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}