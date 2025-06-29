# Duplication Prevention Workflow

## Purpose
This workflow prevents code duplication by establishing systematic checks and patterns for identifying, preventing, and refactoring duplicate code across the POD Protocol codebase.

---

## Pre-Implementation Duplication Check

### Required Steps Before Coding
1. **Codebase Search**: Search for similar functionality
2. **Component Inventory**: Review existing components and services
3. **Pattern Analysis**: Check for established patterns
4. **Abstraction Opportunities**: Identify shared functionality

### Search Commands
```bash
# Search for similar function names
grep -r "function.*similar_name" packages/

# Search for similar class patterns
grep -r "class.*Pattern" packages/

# Search for API endpoints
grep -r "router\.*endpoint" packages/

# Search for React components
grep -r "export.*Component" packages/frontend/src/components/
```

---

## Duplication Detection Tools

### Automated Detection
```bash
# Install duplication detection tools
bun add -D jscpd   # JavaScript/TypeScript duplicate detection
bun add -D similarity  # General code similarity

# Run duplication analysis
bunx jscpd packages/ --threshold 10 --format "typescript,javascript"

# Generate duplication report
bunx jscpd packages/ --output ./reports/duplication-report.html
```

### Manual Review Checklist
- [ ] Similar function signatures
- [ ] Repeated business logic
- [ ] Duplicate API endpoint patterns
- [ ] Identical component structures
- [ ] Repeated validation logic
- [ ] Similar error handling patterns
- [ ] Duplicate configuration objects
- [ ] Repeated utility functions

---

## Common Duplication Patterns

### API Route Duplication
**Problem**: Multiple endpoints with similar CRUD operations
```typescript
// Duplicated pattern - BAD
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await db.agent.findMany();
    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels', async (req, res) => {
  try {
    const channels = await db.channel.findMany();
    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Solution**: Generic CRUD controller
```typescript
// Shared pattern - GOOD
class CrudController<T> {
  constructor(private model: any) {}
  
  async findAll(req: Request, res: Response) {
    try {
      const data = await this.model.findMany();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

const agentController = new CrudController(db.agent);
const channelController = new CrudController(db.channel);
```

### React Component Duplication
**Problem**: Similar components with minor variations
```typescript
// Duplicated components - BAD
export const AgentCard = ({ agent }) => (
  <div className="card">
    <h3>{agent.name}</h3>
    <p>{agent.description}</p>
    <button>View Details</button>
  </div>
);

export const ChannelCard = ({ channel }) => (
  <div className="card">
    <h3>{channel.name}</h3>
    <p>{channel.description}</p>
    <button>View Details</button>
  </div>
);
```

**Solution**: Generic card component
```typescript
// Shared component - GOOD
interface CardProps {
  title: string;
  description: string;
  onViewDetails: () => void;
}

export const Card: React.FC<CardProps> = ({ title, description, onViewDetails }) => (
  <div className="card">
    <h3>{title}</h3>
    <p>{description}</p>
    <button onClick={onViewDetails}>View Details</button>
  </div>
);
```

### Service Layer Duplication
**Problem**: Repeated service patterns
```typescript
// Duplicated services - BAD
class AgentService {
  async validateInput(data: any) {
    if (!data.name) throw new Error('Name required');
    if (!data.type) throw new Error('Type required');
  }
  
  async create(data: AgentData) {
    await this.validateInput(data);
    return await db.agent.create({ data });
  }
}

class ChannelService {
  async validateInput(data: any) {
    if (!data.name) throw new Error('Name required');
    if (!data.type) throw new Error('Type required');
  }
  
  async create(data: ChannelData) {
    await this.validateInput(data);
    return await db.channel.create({ data });
  }
}
```

**Solution**: Base service class
```typescript
// Shared base service - GOOD
abstract class BaseService<T> {
  protected abstract model: any;
  protected abstract validationSchema: any;
  
  protected async validateInput(data: any) {
    return this.validationSchema.parse(data);
  }
  
  async create(data: T) {
    const validated = await this.validateInput(data);
    return await this.model.create({ data: validated });
  }
}

class AgentService extends BaseService<AgentData> {
  protected model = db.agent;
  protected validationSchema = agentSchema;
}
```

---

## Abstraction Strategies

### 1. Higher-Order Functions
```typescript
// Create reusable async handlers
const withErrorHandling = (fn: Function) => async (req: Request, res: Response) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Usage
app.get('/api/agents', withErrorHandling(async (req) => {
  return await agentService.findAll();
}));
```

### 2. Generic Utilities
```typescript
// Create reusable utilities
export const createApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  timestamp: new Date().toISOString()
});

export const createErrorResponse = (error: string) => ({
  success: false,
  error,
  timestamp: new Date().toISOString()
});
```

### 3. Configuration-Based Components
```typescript
// Configuration-driven components
interface FormFieldConfig {
  name: string;
  type: 'text' | 'email' | 'password' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
}

const DynamicForm: React.FC<{ fields: FormFieldConfig[] }> = ({ fields }) => (
  <form>
    {fields.map(field => (
      <FormField key={field.name} config={field} />
    ))}
  </form>
);
```

---

## Refactoring Existing Duplications

### Identification Process
1. **Run automated tools**: Use jscpd to find duplicates
2. **Manual code review**: Look for patterns in similar files
3. **Team review**: Discuss found duplications in code review
4. **Prioritize refactoring**: Focus on high-impact duplications

### Refactoring Steps
1. **Identify common patterns**
2. **Extract shared functionality**
3. **Create abstractions**
4. **Update all instances**
5. **Test thoroughly**
6. **Document patterns**

### Refactoring Checklist
- [ ] Backup original code
- [ ] Create comprehensive tests
- [ ] Extract shared logic to utilities/base classes
- [ ] Update all duplicate instances
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Remove dead code

---

## Prevention Strategies

### Code Review Guidelines
- **Always search** for existing similar functionality
- **Require justification** for any apparent duplication
- **Suggest abstractions** during code review
- **Flag potential duplications** in PR comments

### Development Practices
- **Start with search**: Always search before implementing
- **Think abstractions first**: Consider generic solutions
- **Extract early**: Move repeated code to shared utilities
- **Document patterns**: Maintain pattern library

### Team Training
- **Share common patterns** in team meetings
- **Create coding examples** for common scenarios
- **Regular refactoring sessions** to address duplications
- **Knowledge sharing** of existing utilities and patterns

---

## File Inventory Management

### Component Registry
Maintain a comprehensive list of all components:
```typescript
// component-registry.ts
export const components = {
  ui: [
    'Button', 'Card', 'Modal', 'Form', 'Table', 'Input'
  ],
  layout: [
    'Header', 'Sidebar', 'Footer', 'Layout', 'Container'
  ],
  business: [
    'AgentList', 'ChannelView', 'MessageThread', 'Analytics'
  ]
};
```

### Service Registry
```typescript
// service-registry.ts
export const services = {
  core: ['BaseService', 'ApiService', 'ValidationService'],
  domain: ['AgentService', 'ChannelService', 'MessageService'],
  utility: ['Logger', 'Cache', 'Queue', 'Metrics']
};
```

### Update productContext.md
Always maintain current file inventory in `.cursor/memory/productContext.md`:
- List all major components
- Document component purposes
- Track component relationships
- Note shared utilities and patterns

---

## Automated Prevention Tools

### Pre-commit Hooks
```bash
#!/bin/bash
# .git/hooks/pre-commit
echo "Checking for code duplications..."

# Run duplication detection
bunx jscpd packages/ --threshold 10 > duplication-report.txt

# Check if significant duplications found
if grep -q "Found" duplication-report.txt; then
  echo "⚠️  Code duplications detected. Review before committing:"
  cat duplication-report.txt
  echo "Consider refactoring duplicated code or add explanation in commit message."
  # Uncomment to block commits with duplications
  # exit 1
fi
```

### CI/CD Integration
```yaml
# .github/workflows/duplication-check.yml
name: Duplication Check
on: [push, pull_request]
jobs:
  duplication:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: bun install
      - run: bunx jscpd packages/ --threshold 10
      - run: bunx jscpd packages/ --format json > duplication-report.json
      - uses: actions/upload-artifact@v3
        with:
          name: duplication-report
          path: duplication-report.json
```

### IDE Integration
```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll": true
  },
  "search.exclude": {
    "**/*.min.js": true,
    "**/node_modules": true,
    "**/dist": true
  }
}
```

---

## Metrics and Monitoring

### Duplication Metrics
Track these metrics over time:
- **Total lines of duplicated code**
- **Number of duplicate blocks**
- **Duplication percentage by package**
- **Refactoring impact (reduction in duplications)**

### Reporting
Generate monthly reports:
```bash
#!/bin/bash
# monthly-duplication-report.sh
DATE=$(date +%Y-%m)
bunx jscpd packages/ --format json > reports/duplication-$DATE.json
echo "Duplication report generated for $DATE"
```

---

## Documentation Requirements

### Pattern Documentation
For each abstraction created:
- **Purpose**: Why the pattern was created
- **Usage**: How to use the pattern
- **Examples**: Code examples
- **Considerations**: When to use/not use

### Refactoring Documentation
For each major refactoring:
- **Original problem**: What duplication was addressed
- **Solution**: How it was abstracted
- **Impact**: Files affected and benefits
- **Migration guide**: How to update existing code

---

## Emergency Duplication Handling

### When Duplication is Acceptable
- **Temporary code**: Short-term implementations
- **Performance critical**: When abstraction adds overhead
- **Domain-specific logic**: When logic is truly different
- **External constraints**: When external APIs require specific patterns

### Documentation Requirements
When accepting duplication:
- **Add comments** explaining why duplication is necessary
- **Create tracking issue** for future refactoring
- **Set timeline** for revisiting the duplication
- **Document in decision log**

---

## Success Metrics

### Code Quality Improvements
- **Reduced maintenance burden**: Less code to maintain
- **Improved consistency**: Standardized patterns
- **Faster development**: Reusable components
- **Better testability**: Shared test utilities

### Team Productivity
- **Faster feature development**: Reusing existing patterns
- **Reduced bugs**: Fewer places for bugs to hide
- **Better onboarding**: Clear patterns for new developers
- **Code review efficiency**: Familiar patterns

---

## Notes
- Always consider the cost/benefit of abstraction
- Don't over-abstract - sometimes duplication is acceptable
- Maintain balance between DRY principle and code clarity
- Regular team discussions about duplication patterns
- Update this workflow based on team feedback and experience 