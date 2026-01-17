import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, Star } from 'lucide-react';
import { toast } from 'sonner';

interface ComparisonResult {
  id: string;
  name: string;
  price: number;
  totalCost: string;
  costPerMillionTokens: string;
  includedPercentage: string;
  savings: string;
  valueScore: number;
}

interface PlanComparisonProps {
  onPlanSelect?: (planId: string) => void;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({ onPlanSelect }) => {
  const [userTokens, setUserTokens] = useState([10000000]);
  const [userImages, setUserImages] = useState([100]);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    comparePlans();
  }, [userTokens, userImages]);

  const comparePlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/compare-plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setComparison(data.data.comparison);
      }
    } catch (error) {
      console.error('比较计划失败:', error);
      toast.error('比较订阅计划失败');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getBestValue = (index: number) => {
    return index === 0 ? (
      <Badge className="bg-green-500 text-white">最佳性价比</Badge>
    ) : null;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          智能计划对比工具
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 使用量设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>预估月Token使用量</span>
              <span className="text-blue-600 font-semibold">{formatTokens(userTokens[0])}</span>
            </label>
            <Slider
              value={userTokens}
              onValueChange={setUserTokens}
              max={500000000}
              min={100000}
              step={100000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>100K</span>
              <span>500M</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>预估月图像生成量</span>
              <span className="text-blue-600 font-semibold">{userImages[0]}张</span>
            </label>
            <Slider
              value={userImages}
              onValueChange={setUserImages}
              max={5000}
              min={10}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>10张</span>
              <span>5000张</span>
            </div>
          </div>
        </div>

        {/* 对比结果 */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {comparison.map((plan, index) => (
              <div 
                key={plan.id} 
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {getBestValue(index)}
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className={`font-bold ${getScoreColor(plan.valueScore)}`}>
                      {plan.valueScore}分
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500">基础价格</div>
                    <div className="font-semibold">¥{plan.price}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">预计总成本</div>
                    <div className="font-semibold text-blue-600">¥{plan.totalCost}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">每百万Tokens</div>
                    <div className="font-semibold">¥{plan.costPerMillionTokens}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">包含比例</div>
                    <div className="font-semibold">{plan.includedPercentage}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">节省</div>
                    <div className="font-semibold text-green-600">
                      {plan.savings}
                    </div>
                  </div>
                </div>

                {showDetails && (
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>• 您的需求: {formatTokens(userTokens[0])} tokens, {userImages[0]} 张图片</div>
                      <div>• 性价比评分: {plan.valueScore}/100</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? '收起详情' : '查看详情'}
                  </Button>
                  
                  {index === 0 && (
                    <Button
                      onClick={() => {
                        onPlanSelect?.(plan.id);
                        toast.success(`已选择最具性价比的${plan.name}`);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      选择此计划
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分析结果 */}
        {comparison.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">智能分析结果</h4>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 根据{formatTokens(userTokens[0])} tokens和{userImages[0]}张图像的使用需求</p>
              <p>• <span className="font-semibold">{comparison[0]?.name}</span> 是最具性价比的选择</p>
              <p>• 预计月成本 <span className="font-semibold">¥{comparison[0]?.totalCost}</span></p>
              <p>• 每百万Token仅需 <span className="font-semibold">¥{comparison[0]?.costPerMillionTokens}</span></p>
            </div>
          </div>
        )}

        {/* 快速比较提示 */}
        <div className="text-xs text-gray-500 text-center">
          <p>💡 提示：调整使用量滑块可以实时比较不同计划在您需求下的性价比</p>
          <p>🎯 绿色高亮的计划是当前使用量下的最佳选择</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanComparison;