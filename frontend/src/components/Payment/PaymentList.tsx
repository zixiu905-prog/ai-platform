import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import PaymentStatus from './PaymentStatus';

interface Payment {
  id: string;
  outTradeNo: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description?: string;
  createdAt: string;
  plan?: {
    id: string;
    name: string;
  };
}

interface PaymentListProps {
  userId: string;
  onPaymentSelect?: (payment: Payment) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({
  userId,
  onPaymentSelect
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState<Record<string, { count: number; amount: number }>>({});

  // 筛选条件
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // 获取支付列表
  const fetchPayments = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`/api/payment/query/user/${userId}?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data.payments);
        setPagination(prev => ({
          ...prev,
          page: data.data.pagination.page,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages
        }));
        setStats(data.data.stats);
      } else {
        setError(data.message || '获取支付列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPayments(1);
    }
  }, [userId]);

  // 处理筛选
  const handleFilter = () => {
    fetchPayments(1);
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      paymentMethod: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => fetchPayments(1), 0);
  };

  // 处理页码变化
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchPayments(newPage);
    }
  };

  // 导出数据
  const exportData = () => {
    const csvContent = [
      ['订单号', '金额', '状态', '支付方式', '创建时间', '描述'].join(','),
      ...payments.map(payment => [
        payment.outTradeNo,
        payment.amount.toFixed(2),
        payment.status,
        payment.paymentMethod,
        new Date(payment.createdAt).toLocaleString(),
        payment.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment_records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'SUCCESS': '支付成功',
      'PENDING': '等待支付',
      'CANCELLED': '已取消',
      'REFUNDED': '已退款'
    };
    return statusMap[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'SUCCESS': 'text-green-600 bg-green-50',
      'PENDING': 'text-yellow-600 bg-yellow-50',
      'CANCELLED': 'text-gray-600 bg-gray-50',
      'REFUNDED': 'text-blue-600 bg-blue-50'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">支付记录</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>筛选</span>
            </button>
            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
            <button
              onClick={() => fetchPayments()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-gray-600`} />
            </button>
          </div>
        </div>

        {/* 筛选表单 */}
        {showFilters && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  搜索订单号
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="输入订单号搜索"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支付状态
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部状态</option>
                  <option value="SUCCESS">支付成功</option>
                  <option value="PENDING">等待支付</option>
                  <option value="CANCELLED">已取消</option>
                  <option value="REFUNDED">已退款</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支付方式
                </label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部方式</option>
                  <option value="WECHAT_NATIVE">微信扫码</option>
                  <option value="WECHAT_JSAPI">微信JSAPI</option>
                  <option value="WECHAT_H5">微信H5</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              应用筛选
            </button>
          </div>
          </>
        )}
      </div>

      {/* 统计信息 */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([status, data]) => (
            <div key={status} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className={`text-sm font-medium ${getStatusColor(status)} px-2 py-1 rounded inline-block mb-2`}>
                {getStatusText(status)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ¥{data.amount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                {data.count} 笔订单
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 支付列表 */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading && payments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无支付记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      订单号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金额
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      支付方式
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm">
                        <div>
                          <div className="font-mono text-xs">{payment.outTradeNo}</div>
                          {payment.plan && (
                            <div className="text-gray-500">{payment.plan.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">
                        ¥{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {payment.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <button
                          onClick={() => onPaymentSelect?.(payment)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>详情</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {pagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示第 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                  共 {pagination.total} 条记录
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentList;