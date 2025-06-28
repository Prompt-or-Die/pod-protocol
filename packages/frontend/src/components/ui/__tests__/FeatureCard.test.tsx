import { render, screen } from '@testing-library/react';
import FeatureCard from '../FeatureCard';

describe('FeatureCard', () => {
  it('renders provided content', () => {
    render(<FeatureCard icon={<span data-testid="icon" />} title="Hello" description="World" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
