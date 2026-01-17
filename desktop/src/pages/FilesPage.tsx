import React, { useState } from 'react';
import { Tabs, Card, Typography } from 'antd';
import { FileOutlined, UploadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { FileUploader } from '../components/FileUploader';
import { FileExplorer } from '../components/FileExplorer';
import { notificationManager } from '../services/notificationManager';

const { Title } = Typography;
const { TabPane } = Tabs;

export const FilesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('explorer');

  const handleUploadComplete = (files: any[]) => {
    notificationManager.showSuccess(
      '文件上传完成', 
      `成功上传 ${files.length} 个文件到本地存储`
    );
  };

  const handleFileSelect = (file: any) => {
    console.log('选中文件:', file);
    // TODO: 处理文件选择逻辑
  };

  const handleDirectorySelect = (path: string) => {
    console.log('选中目录:', path);
    // TODO: 处理目录选择逻辑
  };

  return (
    <div className="files-page">
      <Title level={2}>文件管理</Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <FolderOpenOutlined />
              文件浏览器
            </span>
          }
          key="explorer"
        >
          <Card>
            <FileExplorer
              onSelectFile={handleFileSelect}
              onSelectDirectory={handleDirectorySelect}
              selectable={true}
              showActions={true}
            />
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <UploadOutlined />
              文件上传
            </span>
          }
          key="upload"
        >
          <FileUploader
            accept={['*']}
            maxSize={100}
            maxFiles={20}
            onUploadComplete={handleUploadComplete}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};