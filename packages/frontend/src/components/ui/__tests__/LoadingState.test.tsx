import { render, screen } from '@testing-library/react';
import LoadingState, { LoadingSpinner, LoadingDots, LoadingPulse } from '../LoadingState';

describe('LoadingState', () => {
  it('renders with default props', () => {
    render(<LoadingState />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-path-icon')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Connecting to server..." />);
    
    expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
  });

  it('renders submessage when provided', () => {
    render(
      <LoadingState 
        message="Loading data" 
        submessage="This may take a few moments"
      />
    );
    
    expect(screen.getByText('Loading data')).toBeInTheDocument();
    expect(screen.getByText('This may take a few moments')).toBeInTheDocument();
  });

  it('hides spinner when showSpinner is false', () => {
    render(<LoadingState showSpinner={false} />);
    
    expect(screen.queryByTestId('arrow-path-icon')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies small size classes', () => {
    render(<LoadingState size="sm" />);
    
    const title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-lg');
  });

  it('applies medium size classes', () => {
    render(<LoadingState size="md" />);
    
    const title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-xl');
  });

  it('applies large size classes', () => {
    render(<LoadingState size="lg" />);
    
    const title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-2xl');
  });

  it('applies custom className', () => {
    render(<LoadingState className="custom-loading" />);
    
    const container = document.querySelector('.custom-loading');
    expect(container).toBeInTheDocument();
  });

  it('displays correct text colors', () => {
    render(
      <LoadingState 
        message="Test Message" 
        submessage="Test Submessage"
      />
    );
    
    const title = screen.getByText('Test Message');
    const subtitle = screen.getByText('Test Submessage');
    
    expect(title).toHaveClass('text-white');
    expect(subtitle).toHaveClass('text-gray-400');
  });
});

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('arrow-path-icon');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveStyle({
      width: '24px',
      height: '24px',
    });
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size={48} />);
    
    const spinner = screen.getByTestId('arrow-path-icon');
    expect(spinner).toHaveStyle({
      width: '48px',
      height: '48px',
    });
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    const container = document.querySelector('.custom-spinner');
    expect(container).toBeInTheDocument();
  });

  it('has purple color', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('arrow-path-icon');
    expect(spinner).toHaveClass('text-purple-400');
  });
});

describe('LoadingDots', () => {
  it('renders three dots', () => {
    render(<LoadingDots />);
    
    const dots = document.querySelectorAll('.bg-purple-400.rounded-full');
    expect(dots).toHaveLength(3);
  });

  it('applies custom className', () => {
    render(<LoadingDots className="custom-dots" />);
    
    const container = document.querySelector('.custom-dots');
    expect(container).toBeInTheDocument();
  });

  it('has proper dot styling', () => {
    render(<LoadingDots />);
    
    const dots = document.querySelectorAll('.bg-purple-400.rounded-full');
    dots.forEach(dot => {
      expect(dot).toHaveClass('w-2', 'h-2', 'bg-purple-400', 'rounded-full');
    });
  });

  it('has proper container spacing', () => {
    render(<LoadingDots />);
    
    const container = document.querySelector('.flex.space-x-1');
    expect(container).toBeInTheDocument();
  });
});

describe('LoadingPulse', () => {
  it('renders pulse element', () => {
    render(<LoadingPulse />);
    
    const pulse = document.querySelector('.bg-purple-400.rounded-full');
    expect(pulse).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingPulse className="custom-pulse" />);
    
    const pulse = document.querySelector('.custom-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('has proper sizing and styling', () => {
    render(<LoadingPulse />);
    
    const pulse = document.querySelector('.bg-purple-400.rounded-full');
    expect(pulse).toHaveClass('w-4', 'h-4', 'bg-purple-400', 'rounded-full');
  });
});

describe('Animation behavior', () => {
  it('LoadingState contains motion elements', () => {
    render(<LoadingState message="Test" submessage="Test sub" />);
    
    // Framer motion components are mocked to render as divs
    // We can check for the presence of the text elements that would be animated
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Test sub')).toBeInTheDocument();
  });

  it('spinner icon is present for animation', () => {
    render(<LoadingSpinner />);
    
    const spinnerIcon = screen.getByTestId('arrow-path-icon');
    expect(spinnerIcon).toBeInTheDocument();
  });
});

describe('Responsive design', () => {
  it('applies responsive text sizes for different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    
    let title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-lg');
    
    rerender(<LoadingState size="md" />);
    title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-xl');
    
    rerender(<LoadingState size="lg" />);
    title = screen.getByText('Loading...');
    expect(title).toHaveClass('text-2xl');
  });

  it('applies responsive padding for different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    
    let container = document.querySelector('.py-8');
    expect(container).toBeInTheDocument();
    
    rerender(<LoadingState size="md" />);
    container = document.querySelector('.py-12');
    expect(container).toBeInTheDocument();
    
    rerender(<LoadingState size="lg" />);
    container = document.querySelector('.py-20');
    expect(container).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('has proper semantic structure', () => {
    render(
      <LoadingState 
        message="Loading content" 
        submessage="Please wait"
      />
    );
    
    // Title should be a heading
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Loading content');
    
    // Check text hierarchy
    expect(title).toHaveClass('font-semibold');
  });

  it('provides meaningful text for screen readers', () => {
    render(<LoadingState message="Loading user data" />);
    
    expect(screen.getByText('Loading user data')).toBeInTheDocument();
  });

  it('loading elements are properly contained', () => {
    render(<LoadingState />);
    
    const container = document.querySelector('.flex.flex-col.items-center.justify-center.text-center');
    expect(container).toBeInTheDocument();
  });
});