import React, { useState } from 'react';
import { Conversation } from '../../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageSquare, Plus, Search, MoreVertical, Trash2, PenSquare } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  onRenameConversation?: (conversationId: string, title: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isLoading = false,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个对话吗？')) {
      onDeleteConversation?.(conversationId);
      setShowMenu(null);
    }
  };

  const handleRename = (conversationId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversationId);
    setEditingTitle(currentTitle);
    setShowMenu(null);
  };

  const handleSaveRename = (conversationId: string) => {
    if (editingTitle.trim() && onRenameConversation) {
      onRenameConversation(conversationId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800 border-r">
      {/* 头部 */}
      <div className="p-4 border-b">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          新建对话
        </button>
      </div>

      {/* 搜索框 */}
      <div className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-2" />
            <p>{searchTerm ? '没有找到匹配的对话' : '暂无对话记录'}</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {editingId === conversation.id ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveRename(conversation.id);
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveRename(conversation.id)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {conversation.messages.length > 0 
                            ? conversation.messages[conversation.messages.length - 1].content
                            : '暂无消息'
                          }
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{conversation.messages.length} 条消息</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(conversation.updatedAt, {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* 操作菜单 */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(showMenu === conversation.id ? null : conversation.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {showMenu === conversation.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                            <button
                              onClick={(e) => handleRename(conversation.id, conversation.title, e)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                            >
                              <PenSquare size={14} />
                              重命名
                            </button>
                            <button
                              onClick={(e) => handleDelete(conversation.id, e)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-left text-red-500"
                            >
                              <Trash2 size={14} />
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}