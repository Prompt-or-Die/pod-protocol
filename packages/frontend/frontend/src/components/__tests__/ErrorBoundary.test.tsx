import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error when triggerError prop is true
const ProblematicComponent = ({ triggerError }: { triggerError: boolean }) => {
  if (triggerError) {
    throw new Error('Test error message');
  }
  return <div>Normal component content</div>;
};

// Mock console.error to avoid test output noise
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal component content')).toBeInTheDocument();
  });

  it('displays error UI when child component throws an error', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('displays custom fallback UI when provided', () => {
    const CustomFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('hides error details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('calls onError callback when error occurs', () => {
    const onErrorMock = jest.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('resets error state when "Try Again" button is clicked', async () => {
    const user = userEvent.setup();
    let shouldError = true;

    const TestComponent = () => {
      if (shouldError) {
        throw new Error('Test error');
      }
      return <div>Component recovered</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition
    shouldError = false;

    // Click "Try Again"
    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);

    // Component should recover
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component recovered')).toBeInTheDocument();
  });

  it('reloads page when "Reload Page" button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    await user.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('hides reload button when showReload is false', () => {
    render(
      <ErrorBoundary showReload={false}>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('renders error boundary with proper styling classes', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByText('Something went wrong').closest('div');
    expect(errorContainer).toHaveClass('text-2xl', 'font-bold', 'text-white');
  });

  it('handles multiple consecutive errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblematicComponent triggerError={false} />
      </ErrorBoundary>
    );

    // First error
    rerender(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Second error (should still display error UI)
    rerender(
      <ErrorBoundary>
        <ProblematicComponent triggerError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});