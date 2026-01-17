/**
 * Photoshop集成组件
 * 提供Photoshop操作的界面和功能
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  message, 
  Input, 
  Select, 
  Slider, 
  Divider, 
  Row, 
  Col, 
  List, 
  Popconfirm,
  Typography,
  Badge,
  Progress,
  Upload,
  Modal,
  Form,
  Switch,
  Collapse,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  MergeOutlined, 
  UndoOutlined, 
  RedoOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  FilterOutlined,
  FontSizeOutlined,
  PictureOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { photoshopService, type PhotoshopLayer, type PhotoshopTextOptions, type PhotoshopFilter } from '../services/photoshopService';
import './PhotoshopIntegration.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface Operation {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const PhotoshopIntegration: React.FC = () => {
  // 连接状态
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  
  // 图层管理
  const [layers, setLayers] = useState<PhotoshopLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // 操作历史
  const [operations, setOperations] = useState<any[]>([]);
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null);
  
  // 工具状态
  const [activeTool, setActiveTool] = useState<string>('select');
  const [processing, setProcessing] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  // 滤镜设置
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filterParameters, setFilterParameters] = useState<Record<string, any>>({});
  
  // 文本设置
  const [textOptions, setTextOptions] = useState<PhotoshopTextOptions>({
    text: '',
    font: 'Arial',
    size: 24,
    color: '#000000',
    x: 100,
    y: 100
  });
  
  // 可用滤镜和字体
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  
  // 模态框状态
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // 表单引用
  const [textForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // 初始化
  useEffect(() => {
    initializePhotoshopService();
    loadAvailableOptions();
  }, []);

  /**
   * 初始化Photoshop服务
   */
  const initializePhotoshopService = async () => {
    try {
      // 监听Photoshop服务事件
      photoshopService.on('connected', handleConnected);
      photoshopService.on('disconnected', handleDisconnected);
      photoshopService.on('layerCreated', handleLayerCreated);
      photoshopService.on('layerDeleted', handleLayerDeleted);
      photoshopService.on('layersMerged', handleLayersMerged);
      photoshopService.on('filterApplied', handleFilterApplied);
      photoshopService.on('textAdded', handleTextAdded);
      photoshopService.on('imageImported', handleImageImported);
      photoshopService.on('imageExported', handleImageExported);
      photoshopService.on('operationUndone', handleOperationUndone);
      photoshopService.on('batchProcessCompleted', handleBatchProcessCompleted);
      photoshopService.on('error', handleError);

      // 检查连接状态
      const connected = photoshopService.isPhotoshopConnected();
      setIsConnected(connected);
      
      if (connected) {
        const info = photoshopService.getConnectionInfo();
        setConnectionInfo(info);
      }
    } catch (error) {
      console.error('初始化Photoshop服务失败:', error);
      message.error('初始化Photoshop服务失败');
    }
  };

  /**
   * 加载可用选项
   */
  const loadAvailableOptions = async () => {
    try {
      const filters = photoshopService.getAvailableFilters();
      const fonts = await photoshopService.getSystemFonts();
      
      setAvailableFilters(filters);
      setSystemFonts(fonts);
    } catch (error) {
      console.error('加载选项失败:', error);
    }
  };

  /**
   * 事件处理器
   */
  const handleConnected = () => {
    setIsConnected(true);
    const info = photoshopService.getConnectionInfo();
    setConnectionInfo(info);
    message.success('已连接到Photoshop');
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    setConnectionInfo(null);
    message.warning('与Photoshop的连接已断开');
  };

  const handleLayerCreated = (layer: PhotoshopLayer) => {
    setLayers(prev => [...prev, layer]);
    message.success(`图层 "${layer.name}" 已创建`);
  };

  const handleLayerDeleted = (layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    message.success('图层已删除');
  };

  const handleLayersMerged = (data: any) => {
    setLayers(prev => {
      const filtered = prev.filter(layer => !data.sourceLayerIds.includes(layer.id));
      return [...filtered, data.mergedLayer];
    });
    message.success(`已合并 ${data.sourceLayerIds.length} 个图层`);
  };

  const handleFilterApplied = (filter: any) => {
    message.success(`滤镜 "${filter.name}" 已应用`);
    updateOperations();
  };

  const handleTextAdded = (text: any) => {
    message.success('文本已添加');
    updateOperations();
  };

  const handleImageImported = (data: any) => {
    setLayers(prev => [...prev, data.layer]);
    message.success('图片已导入');
  };

  const handleImageExported = (exportResult: any) => {
    message.success(`图片已导出到: ${exportResult.outputPath}`);
    updateOperations();
  };

  const handleOperationUndone = (operation: any) => {
    message.success('操作已撤销');
    updateLayers();
    updateOperations();
  };

  const handleBatchProcessCompleted = (results: any[]) => {
    message.success(`批量处理完成，共处理 ${results.length} 项操作`);
    updateOperations();
  };

  const handleError = (error: any) => {
    console.error('Photoshop服务错误:', error);
    message.error(`操作失败: ${error.message || error}`);
  };

  /**
   * 更新图层列表
   */
  const updateLayers = async () => {
    try {
      // 这里应该从Photoshop获取最新的图层列表
      // 为了简化，我们使用模拟数据
    } catch (error) {
      console.error('更新图层失败:', error);
    }
  };

  /**
   * 更新操作历史
   */
  const updateOperations = () => {
    const history = photoshopService.getOperationHistory();
    setOperations(history);
  };

  /**
   * 连接Photoshop
   */
  const handleConnect = async () => {
    try {
      setProcessing(true);
      await photoshopService.reconnect();
    } catch (error) {
      message.error('连接Photoshop失败');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 创建图层
   */
  const handleCreateLayer = async () => {
    try {
      const layer = await photoshopService.createLayer({
        name: `新图层 ${layers.length + 1}`,
        opacity: 100,
        visible: true
      });
      
      setSelectedLayerId(layer.id);
    } catch (error) {
      message.error('创建图层失败');
    }
  };

  /**
   * 删除图层
   */
  const handleDeleteLayer = async (layerId: string) => {
    try {
      await photoshopService.deleteLayer(layerId);
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null);
      }
    } catch (error) {
      message.error('删除图层失败');
    }
  };

  /**
   * 调整图层
   */
  const handleAdjustLayer = async (layerId: string, adjustments: any) => {
    try {
      await photoshopService.adjustLayer(layerId, adjustments);
      updateLayers();
    } catch (error) {
      message.error('调整图层失败');
    }
  };

  /**
   * 应用滤镜
   */
  const handleApplyFilter = async () => {
    try {
      setProcessing(true);
      const filter: PhotoshopFilter = {
        name: selectedFilter,
        parameters: filterParameters
      };
      
      await photoshopService.applyFilter(filter, selectedLayerId || undefined);
      setFilterModalVisible(false);
    } catch (error) {
      message.error('应用滤镜失败');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 添加文本
   */
  const handleAddText = async () => {
    try {
      setProcessing(true);
      await photoshopService.addText(textOptions);
      setTextModalVisible(false);
      textForm.resetFields();
    } catch (error) {
      message.error('添加文本失败');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 撤销操作
   */
  const handleUndo = async () => {
    try {
      await photoshopService.undo();
    } catch (error) {
      message.error('撤销操作失败');
    }
  };

  /**
   * 重做操作
   */
  const handleRedo = async () => {
    try {
      await photoshopService.redo();
    } catch (error) {
      message.error('重做操作失败');
    }
  };

  /**
   * 导入图片
   */
  const handleImportImage: UploadProps['onChange'] = async (info) => {
    const { file } = info;
    
    try {
      setProcessing(true);
      // 模拟文件路径
      const imagePath = `/path/to/${file.name}`;
      await photoshopService.importImage(imagePath, { asNewLayer: true });
    } catch (error) {
      message.error('导入图片失败');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 导出图片
   */
  const handleExportImage = async () => {
    try {
      setProcessing(true);
      const outputPath = `/path/to/export_${Date.now()}.png`;
      await photoshopService.exportImage(outputPath, {
        format: 'PNG',
        quality: 90,
        optimize: true
      });
    } catch (error) {
      message.error('导出图片失败');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 更新文本选项
   */
  const updateTextOptions = (values: any) => {
    setTextOptions(prev => ({ ...prev, ...values }));
  };

  /**
   * 更新滤镜参数
   */
  const updateFilterParameters = (values: any) => {
    setFilterParameters(values);
  };

  /**
   * 渲染连接状态
   */
  const renderConnectionStatus = () => (
    <Card size="small" className="connection-status">
      <Space>
        <Badge 
          status={isConnected ? "success" : "error"} 
          text={isConnected ? "已连接" : "未连接"} 
        />
        {isConnected && connectionInfo && (
          <Text type="secondary">
            {connectionInfo.app?.name} {connectionInfo.app?.version}
          </Text>
        )}
        {!isConnected && (
          <Button 
            type="primary" 
            size="small" 
            loading={processing}
            onClick={handleConnect}
          >
            连接Photoshop
          </Button>
        )}
      </Space>
    </Card>
  );

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => (
    <Card className="toolbar" size="small">
      <Space wrap>
        <Button 
          icon={<PlusOutlined />} 
          onClick={handleCreateLayer}
          disabled={!isConnected}
        >
          新建图层
        </Button>
        <Button 
          icon={<FilterOutlined />} 
          onClick={() => setFilterModalVisible(true)}
          disabled={!isConnected}
        >
          滤镜
        </Button>
        <Button 
          icon={<FontSizeOutlined />} 
          onClick={() => setTextModalVisible(true)}
          disabled={!isConnected}
        >
          文本
        </Button>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={handleImportImage}
          disabled={!isConnected}
        >
          <Button icon={<ImportOutlined />} disabled={!isConnected}>
            导入图片
          </Button>
        </Upload>
        <Button 
          icon={<ExportOutlined />} 
          onClick={handleExportImage}
          disabled={!isConnected}
        >
          导出图片
        </Button>
        <Divider type="vertical" />
        <Button 
          icon={<UndoOutlined />} 
          onClick={handleUndo}
          disabled={!isConnected}
        >
          撤销
        </Button>
        <Button 
          icon={<RedoOutlined />} 
          onClick={handleRedo}
          disabled={!isConnected}
        >
          重做
        </Button>
        <Button 
          icon={<HistoryOutlined />} 
          onClick={() => setBatchModalVisible(true)}
          disabled={!isConnected}
        >
          批量处理
        </Button>
        <Button 
          icon={<SettingOutlined />} 
          onClick={() => setSettingsModalVisible(true)}
        >
          设置
        </Button>
      </Space>
    </Card>
  );

  /**
   * 渲染图层面板
   */
  const renderLayersPanel = () => (
    <Card 
      title="图层" 
      size="small" 
      className="layers-panel"
      extra={
        <Space>
          <Text type="secondary">{layers.length} 个图层</Text>
        </Space>
      }
    >
      <List
        dataSource={layers}
        renderItem={(layer) => (
          <List.Item
            className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
            onClick={() => setSelectedLayerId(layer.id)}
            actions={[
              <Button
                key="visible"
                type="text"
                size="small"
                icon={layer.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdjustLayer(layer.id, { visible: !layer.visible });
                }}
              />,
              <Button
                key="lock"
                type="text"
                size="small"
                icon={layer.locked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdjustLayer(layer.id, { locked: !layer.locked });
                }}
              />,
              <Popconfirm
                key="delete"
                title="确定删除这个图层吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteLayer(layer.id);
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>{layer.name}</span>
                  <Switch
                    size="small"
                    checked={layer.visible}
                    onChange={(checked) => handleAdjustLayer(layer.id, { visible: checked })}
                  />
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  <div>
                    <Text type="secondary">不透明度: </Text>
                    <Slider
                      min={0}
                      max={100}
                      value={layer.opacity}
                      onChange={(value) => handleAdjustLayer(layer.id, { opacity: value })}
                      style={{ width: 100 }}
                    />
                  </div>
                  <Text type="secondary">
                    混合模式: {layer.blendMode}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: '暂无图层' }}
      />
    </Card>
  );

  /**
   * 渲染操作历史
   */
  const renderHistory = () => (
    <Card title="操作历史" size="small" className="history-panel">
      <List
        dataSource={operations.slice(-10).reverse()}
        renderItem={(operation) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  {operation.type === 'createLayer' && '创建图层'}
                  {operation.type === 'deleteLayer' && '删除图层'}
                  {operation.type === 'applyFilter' && '应用滤镜'}
                  {operation.type === 'addText' && '添加文本'}
                  {operation.type === 'exportImage' && '导出图片'}
                  {operation.type === 'importImage' && '导入图片'}
                  {operation.type === 'mergeLayers' && '合并图层'}
                </Space>
              }
              description={
                <Text type="secondary">
                  {new Date(operation.timestamp).toLocaleString()}
                </Text>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: '暂无操作历史' }}
      />
    </Card>
  );

  return (
    <div className="photoshop-integration">
      {renderConnectionStatus()}
      {renderToolbar()}
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Tabs defaultActiveKey="layers">
            <TabPane tab="图层" key="layers">
              {renderLayersPanel()}
            </TabPane>
            <TabPane tab="历史" key="history">
              {renderHistory()}
            </TabPane>
          </Tabs>
        </Col>
      </Row>

      {/* 文本添加模态框 */}
      <Modal
        title="添加文本"
        open={textModalVisible}
        onCancel={() => setTextModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTextModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            loading={processing}
            onClick={textForm.submit}
          >
            添加
          </Button>
        ]}
      >
        <Form
          form={textForm}
          layout="vertical"
          initialValues={textOptions}
          onValuesChange={updateTextOptions}
          onFinish={handleAddText}
        >
          <Form.Item
            name="text"
            label="文本内容"
            rules={[{ required: true, message: '请输入文本内容' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="font" label="字体">
                <Select>
                  {systemFonts.map(font => (
                    <Select.Option key={font} value={font}>{font}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="size" label="大小">
                <Input type="number" min={6} max={1000} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="color" label="颜色">
                <Input type="color" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="x" label="X坐标">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="y" label="Y坐标">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bold" valuePropName="checked" label="粗体">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="italic" valuePropName="checked" label="斜体">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 滤镜应用模态框 */}
      <Modal
        title="应用滤镜"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFilterModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            loading={processing}
            onClick={filterForm.submit}
          >
            应用
          </Button>
        ]}
      >
        <Form
          form={filterForm}
          layout="vertical"
          onValuesChange={updateFilterParameters}
          onFinish={handleApplyFilter}
        >
          <Form.Item
            name="filter"
            label="滤镜"
            rules={[{ required: true, message: '请选择滤镜' }]}
          >
            <Select
              placeholder="选择滤镜"
              onChange={setSelectedFilter}
              value={selectedFilter}
            >
              {availableFilters.map(filter => (
                <Select.Option key={filter} value={filter}>{filter}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          {/* 这里可以根据选择的滤镜动态渲染不同的参数表单 */}
          {selectedFilter && (
            <Text type="secondary">
              滤镜参数配置功能待完善...
            </Text>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default PhotoshopIntegration;