import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tree, 
  Button, 
  Input, 
  Modal, 
  List, 
  Card, 
  Typography, 
  Space, 
  message,
  Popconfirm
} from 'antd';
import { 
  FolderOutlined, 
  FileOutlined, 
  HomeOutlined, 
  DesktopOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { fileManager } from '../services/fileManager';
import { notificationManager } from '../services/notificationManager';

const { DirectoryTree } = Tree;
const { Title, Text } = Typography;
const { Search } = Input;

interface FileNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: FileNode[];
  path?: string;
  type?: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  extension?: string;
}

interface FileExplorerProps {
  rootPath?: string;
  onSelectFile?: (file: FileInfo) => void;
  onSelectDirectory?: (path: string) => void;
  selectable?: boolean;
  showActions?: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath,
  onSelectFile,
  onSelectDirectory,
  selectable = true,
  showActions = true
}) => {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(rootPath || '');
  const [searchValue, setSearchValue] = useState('');
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ path: string; name: string } | null>(null);

  const loadDirectory = useCallback(async (path: string): Promise<FileNode[]> => {
    try {
      const items = await fileManager.readDirectory(path);
      return items.map(item => ({
        key: item.path,
        title: item.name,
        isLeaf: item.type === 'file',
        type: item.type,
        path: item.path,
        children: item.type === 'directory' ? [] : undefined
      }));
    } catch (error) {
      message.error('读取目录失败: ' + error);
      return [];
    }
  }, []);

  const loadRootDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const path = currentPath || await fileManager.getHomeDirectory();
      setCurrentPath(path);
      const data = await loadDirectory(path);
      setTreeData(data);
    } catch (error) {
      message.error('加载目录失败');
    } finally {
      setLoading(false);
    }
  }, [currentPath, loadDirectory]);

  const handleLoadData = async ({ key, children }: any): Promise<void> => {
    if (children && children.length > 0) return;
    
    try {
      const childData = await loadDirectory(key);
      const updateTreeData = (list: FileNode[], key: string, children: FileNode[]): FileNode[] => {
        return list.map(node => {
          if (node.key === key) {
            return {
              ...node,
              children
            };
          }
          if (node.children) {
            return {
              ...node,
              children: updateTreeData(node.children, key, children)
            };
          }
          return node;
        });
      };
      setTreeData(updateTreeData(treeData, key, childData));
    } catch (error) {
      message.error('加载子目录失败');
    }
  };

  const handleSelect = async (selectedKeys: React.Key[], info: any) => {
    if (!selectable) return;

    const { node } = info;
    setSelectedKeys(selectedKeys as string[]);

    if (node.type === 'file') {
      const fileInfo = await fileManager.getFileInfo(node.path);
      onSelectFile?.(fileInfo);
    } else {
      onSelectDirectory?.(node.path);
    }
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  const navigateTo = async (path: string) => {
    setCurrentPath(path);
    const data = await loadDirectory(path);
    setTreeData(data);
    setExpandedKeys([]);
    setSelectedKeys([]);
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) {
      message.error('请输入文件夹名称');
      return;
    }

    try {
      await fileManager.createDirectory(currentPath, newFolderName.trim());
      setNewFolderModalVisible(false);
      setNewFolderName('');
      await loadRootDirectory();
      
      await notificationManager.showNotification({
        title: '创建成功',
        body: `文件夹 "${newFolderName}" 已创建`,
        icon: 'success'
      });
    } catch (error) {
      message.error('创建文件夹失败: ' + error);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTarget.name.trim()) {
      message.error('请输入新名称');
      return;
    }

    try {
      await fileManager.renameFile(renameTarget.path, renameTarget.name.trim());
      setRenameModalVisible(false);
      setRenameTarget(null);
      await loadRootDirectory();
      
      await notificationManager.showNotification({
        title: '重命名成功',
        body: `已重命名为 "${renameTarget.name}"`,
        icon: 'success'
      });
    } catch (error) {
      message.error('重命名失败: ' + error);
    }
  };

  const handleDelete = async (path: string, name: string) => {
    try {
      await fileManager.deleteFile(path);
      await loadRootDirectory();
      
      await notificationManager.showNotification({
        title: '删除成功',
        body: `"${name}" 已删除`,
        icon: 'success'
      });
    } catch (error) {
      message.error('删除失败: ' + error);
    }
  };

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      await loadRootDirectory();
      return;
    }

    try {
      const results = await fileManager.searchFiles(currentPath, value.trim());
      const searchTreeData: FileNode[] = results.map(item => ({
        key: item.path,
        title: item.name,
        isLeaf: true,
        type: 'file',
        path: item.path
      }));
      setTreeData(searchTreeData);
    } catch (error) {
      message.error('搜索失败: ' + error);
    }
  };

  const getFileIcon = (type?: string) => {
    return type === 'file' ? <FileOutlined /> : <FolderOutlined />;
  };

  useEffect(() => {
    loadRootDirectory();
  }, [loadRootDirectory]);

  const actionButtons = showActions ? (
    <Space>
      <Button 
        icon={<HomeOutlined />} 
        onClick={() => navigateTo(fileManager.getHomeDirectory())}
        title="主目录"
      />
      <Button 
        icon={<DesktopOutlined />} 
        onClick={() => navigateTo(fileManager.getDesktopDirectory())}
        title="桌面"
      />
      <Button 
        icon={<PlusOutlined />} 
        onClick={() => setNewFolderModalVisible(true)}
        title="新建文件夹"
      />
      <Button 
        icon={<ReloadOutlined />} 
        onClick={loadRootDirectory}
        loading={loading}
        title="刷新"
      />
    </Space>
  ) : null;

  return (
    <Card className="file-explorer">
      <Title level={4}>文件浏览器</Title>
      
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {actionButtons}
        
        <Search
          placeholder="搜索文件..."
          allowClear
          enterButton={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
        />

        <DirectoryTree
          multiple={false}
          defaultExpandAll={false}
          onSelect={handleSelect}
          onExpand={handleExpand}
          loadData={handleLoadData}
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          icon={({ type }) => getFileIcon(type)}
          showIcon
        />

        <Text type="secondary">
          当前路径: {currentPath}
        </Text>
      </Space>

      {/* 新建文件夹对话框 */}
      <Modal
        title="新建文件夹"
        open={newFolderModalVisible}
        onOk={createNewFolder}
        onCancel={() => {
          setNewFolderModalVisible(false);
          setNewFolderName('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入文件夹名称"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={createNewFolder}
        />
      </Modal>

      {/* 重命名对话框 */}
      <Modal
        title="重命名"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setRenameTarget(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <Input
          placeholder="请输入新名称"
          value={renameTarget?.name}
          onChange={(e) => setRenameTarget(renameTarget ? { ...renameTarget, name: e.target.value } : null)}
          onPressEnter={handleRename}
        />
      </Modal>
    </Card>
  );
};