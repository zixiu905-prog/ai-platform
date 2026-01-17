import React, { useState, useRef, useCallback } from 'react';
import { 
  Button, 
  Space, 
  Dropdown, 
  Typography, 
  Select, 
  ColorPicker,
  Divider,
  Tooltip
} from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  FontSizeOutlined,
  FontColorsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  PictureOutlined,
  CodeOutlined,
  FormatPainterOutlined,
  EraserOutlined,
  UndoOutlined,
  RedoOutlined,
  FullscreenOutlined,
  CompressOutlined
} from '@ant-design/icons';
import './TextEditor.css';

const { Text } = Typography;
const { Option } = Select;

interface TextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  showCount?: boolean;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  disabled?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '开始输入...',
  maxLength = 5000,
  showCount = true,
  autoSize = { minRows: 4, maxRows: 12 },
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 执行命令
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange?.(content);
      updateHistory(content);
    }
    editorRef.current?.focus();
  }, [onChange]);

  // 更新历史记录
  const updateHistory = useCallback((content: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const content = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
        onChange?.(content);
      }
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, onChange]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const content = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
        onChange?.(content);
      }
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, onChange]);

  // 字体大小
  const fontSizeMenu = (
    <div className="font-size-menu">
      <div className="font-size-item" onClick={() => execCommand('fontSize', '1')}>
        <Text style={{ fontSize: '10px' }}>极小</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '2')}>
        <Text style={{ fontSize: '12px' }}>较小</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '3')}>
        <Text style={{ fontSize: '14px' }}>小</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '4')}>
        <Text style={{ fontSize: '16px' }}>正常</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '5')}>
        <Text style={{ fontSize: '18px' }}>大</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '6')}>
        <Text style={{ fontSize: '24px' }}>较大</Text>
      </div>
      <div className="font-size-item" onClick={() => execCommand('fontSize', '7')}>
        <Text style={{ fontSize: '32px' }}>极大</Text>
      </div>
    </div>
  );

  // 字体颜色
  const handleColorChange = useCallback((color: any) => {
    execCommand('foreColor', color.toHexString());
  }, [execCommand]);

  // 背景颜色
  const handleBgColorChange = useCallback((color: any) => {
    execCommand('hiliteColor', color.toHexString());
  }, [execCommand]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = prompt('请输入链接地址:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // 插入图片
  const insertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataURL = e.target?.result as string;
          execCommand('insertImage', dataURL);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [execCommand]);

  // 清除格式
  const clearFormat = useCallback(() => {
    execCommand('removeFormat');
    execCommand('unlink');
  }, [execCommand]);

  // 插入代码块
  const insertCode = useCallback(() => {
    const code = prompt('请输入代码:');
    if (code) {
      const codeBlock = `<pre><code>${code}</code></pre>`;
      document.execCommand('insertHTML', false, codeBlock);
      if (editorRef.current) {
        const content = editorRef.current.innerHTML;
        onChange?.(content);
        updateHistory(content);
      }
    }
  }, [onChange, updateHistory]);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 处理内容变化
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const textContent = editorRef.current.textContent || '';
      
      // 检查字符限制
      if (textContent.length <= maxLength) {
        onChange?.(content);
        updateHistory(content);
      } else {
        // 超出限制，恢复之前的内容
        editorRef.current.innerHTML = value;
      }
    }
  }, [onChange, maxLength, value, updateHistory]);

  // 初始化编辑器内容
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // 键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            execCommand('underline');
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      }
    };

    const editor = editorRef.current;
    if (editor && !disabled) {
      editor.addEventListener('keydown', handleKeyDown);
      return () => {
        editor.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [execCommand, undo, redo, disabled]);

  const textLength = editorRef.current?.textContent?.length || 0;

  return (
    <div className={`text-editor ${isFullscreen ? 'fullscreen' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="editor-toolbar">
        <Space wrap>
          {/* 撤销/重做 */}
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={undo}
              disabled={historyIndex <= 0 || disabled}
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={redo}
              disabled={historyIndex >= history.length - 1 || disabled}
            />
          </Tooltip>
          
          <Divider type="vertical" />
          
          {/* 基础格式 */}
          <Tooltip title="加粗 (Ctrl+B)">
            <Button
              size="small"
              icon={<BoldOutlined />}
              onClick={() => execCommand('bold')}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="斜体 (Ctrl+I)">
            <Button
              size="small"
              icon={<ItalicOutlined />}
              onClick={() => execCommand('italic')}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="下划线 (Ctrl+U)">
            <Button
              size="small"
              icon={<UnderlineOutlined />}
              onClick={() => execCommand('underline')}
              disabled={disabled}
            />
          </Tooltip>
          
          <Divider type="vertical" />
          
          {/* 字体设置 */}
          <Dropdown overlay={fontSizeMenu} trigger={['click']} disabled={disabled}>
            <Button size="small" icon={<FontSizeOutlined />}>
              字体
            </Button>
          </Dropdown>
          
          <ColorPicker
            size="small"
            onChange={handleColorChange}
            disabled={disabled}
            trigger="click"
          >
            <Button size="small" icon={<FontColorsOutlined />} />
          </ColorPicker>
          
          <ColorPicker
            size="small"
            onChange={handleBgColorChange}
            disabled={disabled}
            trigger="click"
          >
            <Button size="small" icon={<FormatPainterOutlined />} />
          </ColorPicker>
          
          <Divider type="vertical" />
          
          {/* 对齐方式 */}
          <Tooltip title="左对齐">
            <Button
              size="small"
              icon={<AlignLeftOutlined />}
              onClick={() => execCommand('justifyLeft')}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="居中对齐">
            <Button
              size="small"
              icon={<AlignCenterOutlined />}
              onClick={() => execCommand('justifyCenter')}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="右对齐">
            <Button
              size="small"
              icon={<AlignRightOutlined />}
              onClick={() => execCommand('justifyRight')}
              disabled={disabled}
            />
          </Tooltip>
          
          <Divider type="vertical" />
          
          {/* 列表 */}
          <Tooltip title="有序列表">
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => execCommand('insertOrderedList')}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="无序列表">
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => execCommand('insertUnorderedList')}
              disabled={disabled}
            />
          </Tooltip>
          
          <Divider type="vertical" />
          
          {/* 插入内容 */}
          <Tooltip title="插入链接">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={insertLink}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="插入图片">
            <Button
              size="small"
              icon={<PictureOutlined />}
              onClick={insertImage}
              disabled={disabled}
            />
          </Tooltip>
          <Tooltip title="插入代码块">
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={insertCode}
              disabled={disabled}
            />
          </Tooltip>
          
          <Divider type="vertical" />
          
          {/* 清除格式 */}
          <Tooltip title="清除格式">
            <Button
              size="small"
              icon={<EraserOutlined />}
              onClick={clearFormat}
              disabled={disabled}
            />
          </Tooltip>
          
          {/* 全屏 */}
          <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
            <Button
              size="small"
              icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              disabled={disabled}
            />
          </Tooltip>
        </Space>
      </div>
      
      <div className="editor-content">
        <div
          ref={editorRef}
          className="editor-input"
          contentEditable={!disabled}
          onInput={handleContentChange}
          style={{
            minHeight: autoSize === true ? 120 : 
                     typeof autoSize === 'object' ? autoSize.minRows! * 24 : 120,
            maxHeight: autoSize === true ? 'none' : 
                     typeof autoSize === 'object' ? autoSize.maxRows! * 24 : 'none'
          }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
        {showCount && (
          <div className="editor-count">
            <Text type="secondary">
              {textLength} / {maxLength}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEditor;