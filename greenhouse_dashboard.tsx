import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import {
  Thermometer, Droplets, Sun, Wind, CloudRain,
  Activity, Menu, X, Bell, Search, LayoutDashboard,
  Cpu, Settings, Leaf, AlertCircle, CheckCircle2
} from 'lucide-react';

const generateHistoricalData = (hours = 24) => {
  const data = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    // Base values with some sine wave variation to simulate day/night cycles
    const hourOfDay = time.getHours();
    const isDay = hourOfDay > 6 && hourOfDay < 18;

    let tempBase = 22 + Math.sin((hourOfDay - 6) / 12 * Math.PI) * 8; // Peaks at midday
    let lightBase = isDay ? 400 + Math.sin((hourOfDay - 6) / 12 * Math.PI) * 600 : 0;

    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: time.getTime(),
      temperature: +(tempBase + (Math.random() * 2 - 1)).toFixed(1), // °C
      humidity: +(60 + Math.random() * 15 - (tempBase - 20)).toFixed(1), // %, inversely related to temp roughly
      soilMoisture: +(45 - (i * 0.1) + Math.random() * 2).toFixed(1), // %, slowly drying out
      light: +(lightBase + (isDay ? Math.random() * 50 : 0)).toFixed(0), // Lux
    });
  }
  return data;
};

const INITIAL_DATA = generateHistoricalData(24);

const SENSORS = [
  { id: 't1', name: '温度传感器 Alpha', type: 'temperature', zone: 'A区', status: 'online' },
  { id: 't2', name: '温度传感器 Beta', type: 'temperature', zone: 'B区', status: 'online' },
  { id: 'h1', name: '湿度传感器 1', type: 'humidity', zone: 'A区', status: 'online' },
  { id: 'sm1', name: '土壤探针 1', type: 'soilMoisture', zone: 'A区', status: 'warning' },
  { id: 'sm2', name: '土壤探针 2', type: 'soilMoisture', zone: 'C区', status: 'offline' },
  { id: 'l1', name: '核心光照计', type: 'light', zone: '中心区', status: 'online' },
];

// --- Reusable UI Components ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, unit, icon: Icon, trend, colorClass, sparklineData, dataKey }) => (
  <Card className="p-3 lg:p-4 hover:shadow-md transition-shadow duration-300">
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-slate-500 text-xs font-medium mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-xl lg:text-2xl font-bold text-slate-800">{value}</h3>
          <span className="text-slate-500 text-xs font-medium">{unit}</span>
        </div>
      </div>
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon size={18} />
      </div>
    </div>

    {/* 使用绝对定位强制保持高度，防止 Flex 坍缩 */}
    <div className="h-10 w-full mt-2 shrink-0 relative">
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              className="text-slate-400"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="mt-2 flex items-center text-xs shrink-0">
      {trend > 0 ? (
        <span className="text-emerald-500 font-medium flex items-center">↑ {Math.abs(trend)}%</span>
      ) : (
        <span className="text-rose-500 font-medium flex items-center">↓ {Math.abs(trend)}%</span>
      )}
      <span className="text-slate-400 ml-1">较昨日</span>
    </div>
  </Card>
);

const StatusBadge = ({ status }) => {
  const styles = {
    online: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    offline: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const icons = {
    online: <CheckCircle2 size={12} className="mr-1" />,
    warning: <AlertCircle size={12} className="mr-1" />,
    offline: <X size={12} className="mr-1" />
  };

  const labels = {
    online: '在线',
    warning: '警告',
    offline: '离线'
  };

  return (
    <span className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
};

// --- Views ---

const DashboardView = ({ data, latestReading }) => {
  return (
    <div className="flex-1 flex flex-col gap-3 lg:gap-4 min-h-[800px] lg:min-h-0">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 shrink-0">
        <MetricCard
          title="平均温度"
          value={latestReading.temperature}
          unit="°C"
          icon={Thermometer}
          trend={+1.2}
          colorClass="bg-orange-50 text-orange-500"
          sparklineData={data.slice(-12)}
          dataKey="temperature"
        />
        <MetricCard
          title="平均湿度"
          value={latestReading.humidity}
          unit="%"
          icon={Droplets}
          trend={-0.5}
          colorClass="bg-blue-50 text-blue-500"
          sparklineData={data.slice(-12)}
          dataKey="humidity"
        />
        <MetricCard
          title="平均土壤湿度"
          value={latestReading.soilMoisture}
          unit="%"
          icon={CloudRain}
          trend={-2.1}
          colorClass="bg-emerald-50 text-emerald-500"
          sparklineData={data.slice(-12)}
          dataKey="soilMoisture"
        />
        <MetricCard
          title="光照强度"
          value={latestReading.light}
          unit=" lx"
          icon={Sun}
          trend={15.4}
          colorClass="bg-amber-50 text-amber-500"
          sparklineData={data.slice(-12)}
          dataKey="light"
        />
      </div>

      {/* Main Charts & Health (Middle Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 flex-1 min-h-[300px] lg:min-h-0">
        {/* Environment Overview */}
        <Card className="lg:col-span-2 p-3 lg:p-4">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-800">环境总览</h3>
              <p className="text-xs text-slate-500">24小时温湿度变化趋势</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5 outline-none">
              <option>最近24小时</option>
              <option>最近7天</option>
              <option>最近30天</option>
            </select>
          </div>
          <div className="flex-1 relative w-full mt-2">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={10} tickMargin={5} minTickGap={30} />
                  <YAxis yAxisId="left" stroke="#f97316" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={10} domain={[30, 100]} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
                  <Area yAxisId="left" type="monotone" dataKey="temperature" name="温度 (°C)" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                  <Area yAxisId="right" type="monotone" dataKey="humidity" name="湿度 (%)" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorHumid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* System Health / Status */}
        <Card className="p-3 lg:p-4 overflow-y-auto">
          <h3 className="text-base font-bold text-slate-800 mb-1 shrink-0">系统健康状态</h3>
          <p className="text-xs text-slate-500 mb-3 shrink-0">传感器网络及设备连接状况</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white rounded-md shadow-sm text-emerald-500">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">API 连接</p>
                  <p className="text-[10px] text-slate-500">已连接至本地服务器</p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">传感器在线率</span>
                <span className="text-slate-800 font-bold">98.2%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '98.2%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">蓄水池水位</span>
                <span className="text-amber-600 font-bold">34%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '34%' }}></div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">近期警报</h4>
              <div className="space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="mt-0.5 text-amber-500"><AlertCircle size={14} /></div>
                  <div>
                    <p className="text-xs text-slate-700">A区土壤水分偏低</p>
                    <p className="text-[10px] text-slate-400">10 分钟前</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-0.5 text-rose-500"><X size={14} /></div>
                  <div>
                    <p className="text-xs text-slate-700">传感器 sm2 连接丢失</p>
                    <p className="text-[10px] text-slate-400">1 小时前</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Charts row (Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 flex-1 min-h-[250px] lg:min-h-0">
         <Card className="p-3 lg:p-4">
           <h3 className="text-sm font-bold text-slate-800 mb-2 shrink-0">土壤湿度分布</h3>
           <div className="flex-1 relative w-full">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(-12)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={10} tickMargin={5} minTickGap={20} />
                  <YAxis stroke="#cbd5e1" fontSize={10} domain={[0, 100]} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Bar dataKey="soilMoisture" name="湿度 %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           </div>
         </Card>
         <Card className="p-3 lg:p-4">
           <h3 className="text-sm font-bold text-slate-800 mb-2 shrink-0">每日光照强度</h3>
           <div className="flex-1 relative w-full">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={10} tickMargin={5} minTickGap={30} />
                  <YAxis stroke="#cbd5e1" fontSize={10} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="light" name="光照 (lx)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
           </div>
         </Card>
      </div>
    </div>
  );
};

const SensorsView = ({ data }) => {
  return (
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">传感器网络</h2>
          <p className="text-sm text-slate-500">管理和监控各个独立节点</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜索传感器..."
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full sm:w-56"
            />
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            添加节点
          </button>
        </div>
      </div>

      <Card className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100 sticky top-0">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl">ID / 名称</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">位置</th>
              <th className="px-4 py-3">当前数值</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 rounded-tr-xl text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SENSORS.map((sensor) => {

              // Helper to get a random realistic value for the table based on type
              let val = "无数据";
              if(sensor.status !== 'offline') {
                if(sensor.type === 'temperature') val = (22 + Math.random() * 4).toFixed(1) + ' °C';
                if(sensor.type === 'humidity') val = (60 + Math.random() * 10).toFixed(1) + ' %';
                if(sensor.type === 'soilMoisture') val = (40 + Math.random() * 15).toFixed(1) + ' %';
                if(sensor.type === 'light') val = Math.floor(800 + Math.random() * 200) + ' lx';
              }

              const typeLabels = {
                temperature: '温度',
                humidity: '湿度',
                soilMoisture: '土壤湿度',
                light: '光照'
              };

              const TypeIcon = {
                temperature: Thermometer,
                humidity: Droplets,
                soilMoisture: CloudRain,
                light: Sun
              }[sensor.type];

              return (
                <tr key={sensor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex flex-col">
                      <span>{sensor.name}</span>
                      <span className="text-xs text-slate-400 font-normal">#{sensor.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon size={14} className="text-slate-400" />
                      {typeLabels[sensor.type]}
                    </div>
                  </td>
                  <td className="px-4 py-3">{sensor.zone}</td>
                  <td className="px-4 py-3 font-mono font-medium">{val}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sensor.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">
                      详情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};


// --- Main App Component ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [data, setData] = useState(INITIAL_DATA);
  const [latestReading, setLatestReading] = useState(INITIAL_DATA[INITIAL_DATA.length - 1]);

  // Simulate incoming real-time data API
  useEffect(() => {
    const interval = setInterval(() => {
      setData(currentData => {
        const lastData = currentData[currentData.length - 1];
        const now = new Date();

        // Slightly fluctuate data based on previous to look organic
        const newTemp = +(lastData.temperature + (Math.random() - 0.5) * 0.5).toFixed(1);
        const newHumid = +(lastData.humidity + (Math.random() - 0.5) * 1.5).toFixed(1);
        const newSoil = +(lastData.soilMoisture - 0.05).toFixed(1); // Gradually dries
        const newLight = lastData.light > 10 ? +(lastData.light + (Math.random() - 0.5) * 20).toFixed(0) : lastData.light;

        const newReading = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: now.getTime(),
          temperature: newTemp,
          humidity: newHumid,
          soilMoisture: newSoil,
          light: newLight,
        };

        setLatestReading(newReading);

        // Keep last 24 points (approx 24h if we pretended this was hourly, but it's faster for demo)
        const newData = [...currentData, newReading];
        if (newData.length > 24) newData.shift();

        return newData;
      });
    }, 5000); // Updates every 5 seconds for visual effect

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: '控制面板', icon: LayoutDashboard },
    { id: 'sensors', label: '传感器网络', icon: Cpu },
    { id: 'climate', label: '气候控制', icon: Wind },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  const tabTitles = {
    'dashboard': '控制面板',
    'sensors': '传感器网络',
    'climate': '气候控制',
    'settings': '系统设置'
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* Sidebar (Desktop) & Drawer (Mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex lg:flex-col
      `}>
        <div className="flex items-center justify-between h-14 px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-emerald-600">
            <Leaf size={20} strokeWidth={2.5} />
            <span className="text-lg font-bold tracking-tight text-slate-800">绿智云监</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">主菜单</p>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm
                  ${activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <item.icon size={16} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Status widget in sidebar */}
          <div className="mt-6 mx-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">系统状态</span>
            </div>
            <p className="text-xs text-slate-600">所有主要系统运行正常。</p>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
              管
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">管理员</p>
              <p className="text-[10px] text-slate-500 truncate">admin@smartgh.cn</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-white/50 backdrop-blur-md border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700 p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
              {tabTitles[activeTab]}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
              实时数据同步中
            </div>

            <button className="relative p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 border border-white rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable/Flexible Content */}
        <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-4 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            {activeTab === 'dashboard' && <DashboardView data={data} latestReading={latestReading} />}
            {activeTab === 'sensors' && <SensorsView data={data} />}

            {(activeTab === 'climate' || activeTab === 'settings') && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <Settings size={40} className="mb-3 text-slate-300" />
                <h2 className="text-lg font-semibold text-slate-700 mb-1">模块开发中</h2>
                <p className="text-sm">【{tabTitles[activeTab]}】 面板正在与硬件控制器集成对接。</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
