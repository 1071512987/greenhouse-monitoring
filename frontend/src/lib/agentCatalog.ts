import type { AgentId } from '../types'

export interface AgentDefinition {
  id: AgentId
  label: string
  shortLabel: string
  hint: string
  description: string
  state: string
}

export const agentCatalog: AgentDefinition[] = [
  { id: 'environment', label: '环境控制智能体', shortLabel: '环境控制', hint: '监测与自动调控', description: '汇聚传感器实时数据，诊断温室环境并生成可审计的调控策略。', state: '规则引擎就绪' },
  { id: 'fertilizer', label: '精准施肥智能体', shortLabel: '精准施肥', hint: '营养诊断与配方', description: '结合土壤、作物和生育期数据，形成分区施肥处方与执行计划。', state: '处方模型待接入' },
  { id: 'robot-dog', label: '植保机器狗智能体', shortLabel: '植保机器狗', hint: '巡检影像识别', description: '接入机器狗摄像头或上传巡检影像，识别病虫害、障碍物与异常植株。', state: '视觉模型待接入' },
  { id: 'phenotype', label: '设施蔬菜表型鉴定智能体', shortLabel: '表型鉴定', hint: 'RGBD 参数提取', description: '上传 RGBD 俯视数据，提取株高、鲜重、叶面积和果实数量等表型指标。', state: '表型模型待接入' },
  { id: 'crop-model', label: '设施蔬菜作物模型智能体', shortLabel: '作物模型', hint: '生长模拟与预测', description: '融合环境、品种和管理参数，模拟作物生长并预测关键生育节点与产量。', state: '模拟引擎待接入' },
  { id: 'machinery-qa', label: '设施蔬菜农机问答智能体', shortLabel: '农机问答', hint: '设备知识问答', description: '面向设施农机的操作、维护和故障问题，提供基于知识库的问答与排障指引。', state: '知识库待接入' },
]

export function getAgentDefinition(id: AgentId) {
  return agentCatalog.find((agent) => agent.id === id) ?? agentCatalog[0]
}
