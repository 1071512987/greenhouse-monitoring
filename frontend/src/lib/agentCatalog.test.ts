import { describe, expect, it } from 'vitest'
import { agentCatalog, getAgentDefinition } from './agentCatalog'

describe('agent catalog', () => {
  it('contains all six specialist agents in navigation order', () => {
    expect(agentCatalog.map((agent) => agent.id)).toEqual([
      'environment',
      'fertilizer',
      'robot-dog',
      'phenotype',
      'crop-model',
      'machinery-qa',
    ])
  })

  it('returns the matching workspace definition', () => {
    expect(getAgentDefinition('phenotype').label).toBe('设施蔬菜表型鉴定智能体')
    expect(getAgentDefinition('machinery-qa').hint).toBe('设备知识问答')
  })
})
