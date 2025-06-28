import { describe, test, expect } from "bun:test";
import { podComPlugin } from '../index.js';
import { PodProtocolServiceImpl } from '../services/podProtocolService.js';
import { registerAgent } from '../actions/registerAgent.js';
import { discoverAgentsAction } from '../actions/discoverAgents.js';
import { sendMessageAction } from '../actions/sendMessage.js';
import { createChannelAction } from '../actions/createChannel.js';
import { agentStatusProvider } from '../providers/agentStatusProvider.js';
import { protocolStatsProvider } from '../providers/protocolStatsProvider.js';
import { collaborationEvaluator } from '../evaluators/collaborationEvaluator.js';
import { reputationEvaluator } from '../evaluators/reputationEvaluator.js';
import { interactionQualityEvaluator } from '../evaluators/interactionQualityEvaluator.js';

describe('PoD Protocol Plugin - Core Structure', () => {
  test('plugin has correct structure', () => {
    expect(podComPlugin).toBeDefined();
    expect(podComPlugin.name).toBe('podcom');
    expect(podComPlugin.description).toContain('PoD Protocol');
  });

  test('plugin exports services', () => {
    expect(podComPlugin.services).toBeDefined();
    expect(podComPlugin.services).toContain(PodProtocolServiceImpl);
  });

  test('plugin exports all actions', () => {
    expect(podComPlugin.actions).toBeDefined();
    expect(podComPlugin.actions).toHaveLength(8);
    expect(podComPlugin.actions).toContain(registerAgent);
    expect(podComPlugin.actions).toContain(discoverAgentsAction);
    expect(podComPlugin.actions).toContain(sendMessageAction);
    expect(podComPlugin.actions).toContain(createChannelAction);
  });

  test('plugin exports providers', () => {
    expect(podComPlugin.providers).toBeDefined();
    expect(podComPlugin.providers).toHaveLength(2);
    expect(podComPlugin.providers).toContain(agentStatusProvider);
    expect(podComPlugin.providers).toContain(protocolStatsProvider);
  });

  test('plugin exports evaluators', () => {
    expect(podComPlugin.evaluators).toBeDefined();
    expect(podComPlugin.evaluators).toHaveLength(3);
    expect(podComPlugin.evaluators).toContain(collaborationEvaluator);
    expect(podComPlugin.evaluators).toContain(reputationEvaluator);
    expect(podComPlugin.evaluators).toContain(interactionQualityEvaluator);
  });

  test('plugin has configuration', () => {
    expect(podComPlugin.config).toBeDefined();
    if (podComPlugin.config) {
      expect(podComPlugin.config.requiredEnvVars).toContain('POD_WALLET_PRIVATE_KEY');
      expect(podComPlugin.config.defaults).toBeDefined();
    }
  });
});

describe('Plugin Actions', () => {
  test('register agent action has correct structure', () => {
    expect(registerAgent.name).toBe('REGISTER_AGENT_POD_PROTOCOL');
    expect(registerAgent.description).toContain('register');
    expect(registerAgent.validate).toBeDefined();
    expect(registerAgent.handler).toBeDefined();
    expect(registerAgent.examples).toBeDefined();
  });

  test('discover agents action has correct structure', () => {
    expect(discoverAgentsAction.name).toBe('DISCOVER_AGENTS_POD_PROTOCOL');
    expect(discoverAgentsAction.description).toContain('discover');
    expect(discoverAgentsAction.similes).toContain('FIND_AGENTS');
  });

  test('send message action has correct structure', () => {
    expect(sendMessageAction.name).toBe('SEND_MESSAGE_POD_PROTOCOL');
    expect(sendMessageAction.description).toContain('message');
    expect(sendMessageAction.similes).toContain('MESSAGE_AGENT');
  });

  test('create channel action has correct structure', () => {
    expect(createChannelAction.name).toBe('CREATE_CHANNEL_POD_PROTOCOL');
    expect(createChannelAction.description).toContain('channel');
    expect(createChannelAction.similes).toContain('CREATE_CHANNEL');
  });
});

describe('Plugin Service', () => {
  test('service has correct type', () => {
    expect(PodProtocolServiceImpl.serviceType).toBe('pod_protocol');
  });

  test('service extends Service class', () => {
    const service = new PodProtocolServiceImpl();
    expect(service).toBeDefined();
    expect(typeof service.initialize).toBe('function');
  });
});