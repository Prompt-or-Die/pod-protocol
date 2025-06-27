import { podComPlugin } from '../index.js';
import { PodProtocolServiceImpl } from '../services/podProtocolService.js';
import { registerAgentAction } from '../actions/registerAgent.js';
import { discoverAgentsAction } from '../actions/discoverAgents.js';
import { sendMessageAction } from '../actions/sendMessage.js';
import { createChannelAction } from '../actions/createChannel.js';

describe('PoD Protocol Plugin', () => {
  test('plugin has correct structure', () => {
    expect(podComPlugin).toBeDefined();
    expect(podComPlugin.name).toBe('podcom');
    expect(podComPlugin.description).toContain('PoD Protocol');
  });

  test('plugin exports services', () => {
    expect(podComPlugin.services).toBeDefined();
    expect(podComPlugin.services).toContain(PodProtocolServiceImpl);
  });

  test('plugin exports actions', () => {
    expect(podComPlugin.actions).toBeDefined();
    expect(podComPlugin.actions).toHaveLength(4);
    expect(podComPlugin.actions).toContain(registerAgentAction);
    expect(podComPlugin.actions).toContain(discoverAgentsAction);
    expect(podComPlugin.actions).toContain(sendMessageAction);
    expect(podComPlugin.actions).toContain(createChannelAction);
  });

  test('plugin has configuration', () => {
    expect(podComPlugin.config).toBeDefined();
    expect(podComPlugin.config.requiredEnvVars).toContain('POD_WALLET_PRIVATE_KEY');
    expect(podComPlugin.config.defaults).toBeDefined();
  });
});

describe('Plugin Actions', () => {
  test('register agent action has correct structure', () => {
    expect(registerAgentAction.name).toBe('REGISTER_AGENT_POD_PROTOCOL');
    expect(registerAgentAction.description).toContain('register');
    expect(registerAgentAction.validate).toBeDefined();
    expect(registerAgentAction.handler).toBeDefined();
    expect(registerAgentAction.examples).toBeDefined();
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