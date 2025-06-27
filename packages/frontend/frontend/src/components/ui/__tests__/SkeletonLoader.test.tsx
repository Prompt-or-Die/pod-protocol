import { render, screen } from '@testing-library/react';
import SkeletonLoader, { 
  SkeletonText, 
  SkeletonCard, 
  SkeletonChannelList, 
  SkeletonButton,
  SkeletonAvatar,
  SkeletonMessage,
  SkeletonChatMessages 
} from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default props', () => {
    render(<SkeletonLoader />);
    
    const skeleton = document.querySelector('.bg-gray-700\\/50');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded');
  });

  it('applies custom width and height', () => {
    render(<SkeletonLoader width={200} height={50} />);
    
    const skeleton = document.querySelector('.bg-gray-700\\/50');
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '50px',
    });
  });

  it('applies rounded style when rounded prop is true', () => {
    render(<SkeletonLoader rounded />);
    
    const skeleton = document.querySelector('.bg-gray-700\\/50');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('applies custom className', () => {
    render(<SkeletonLoader className="custom-class" />);
    
    const skeleton = document.querySelector('.bg-gray-700\\/50');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('renders without animation when animate is false', () => {
    render(<SkeletonLoader animate={false} />);
    
    const skeleton = document.querySelector('.bg-gray-700\\/50');
    expect(skeleton).toBeInTheDocument();
    // Animation is handled by framer-motion, so we just check the element exists
  });
});

describe('SkeletonText', () => {
  it('renders single line by default', () => {
    render(<SkeletonText />);
    
    const skeletons = document.querySelectorAll('.bg-gray-700\\/50');
    expect(skeletons).toHaveLength(1);
  });

  it('renders multiple lines when specified', () => {
    render(<SkeletonText lines={3} />);
    
    const skeletons = document.querySelectorAll('.bg-gray-700\\/50');
    expect(skeletons).toHaveLength(3);
  });

  it('applies custom className', () => {
    render(<SkeletonText className="text-skeleton" />);
    
    const container = document.querySelector('.text-skeleton');
    expect(container).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('renders card skeleton structure', () => {
    render(<SkeletonCard />);
    
    // Check for card container
    const card = document.querySelector('.bg-gray-900\\/50');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-xl', 'p-6', 'border', 'border-purple-500\\/20');
    
    // Check for avatar skeleton (rounded)
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();
    
    // Check for multiple text skeletons
    const textSkeletons = document.querySelectorAll('.bg-gray-700\\/50');
    expect(textSkeletons.length).toBeGreaterThan(3);
  });

  it('applies custom className', () => {
    render(<SkeletonCard className="custom-card" />);
    
    const card = document.querySelector('.custom-card');
    expect(card).toBeInTheDocument();
  });
});

describe('SkeletonChannelList', () => {
  it('renders default number of channel cards', () => {
    render(<SkeletonChannelList />);
    
    const cards = document.querySelectorAll('.bg-gray-900\\/50');
    expect(cards).toHaveLength(3); // Default count
  });

  it('renders custom number of channel cards', () => {
    render(<SkeletonChannelList count={5} />);
    
    const cards = document.querySelectorAll('.bg-gray-900\\/50');
    expect(cards).toHaveLength(5);
  });
});

describe('SkeletonButton', () => {
  it('renders button skeleton with default size', () => {
    render(<SkeletonButton />);
    
    const button = document.querySelector('.rounded-lg');
    expect(button).toBeInTheDocument();
    expect(button).toHaveStyle({
      width: '120px',
      height: '40px',
    });
  });

  it('applies custom className', () => {
    render(<SkeletonButton className="custom-button" />);
    
    const button = document.querySelector('.custom-button');
    expect(button).toBeInTheDocument();
  });
});

describe('SkeletonAvatar', () => {
  it('renders avatar with default size', () => {
    render(<SkeletonAvatar />);
    
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveStyle({
      width: '40px',
      height: '40px',
    });
  });

  it('renders avatar with custom size', () => {
    render(<SkeletonAvatar size={60} />);
    
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).toHaveStyle({
      width: '60px',
      height: '60px',
    });
  });

  it('applies custom className', () => {
    render(<SkeletonAvatar className="custom-avatar" />);
    
    const avatar = document.querySelector('.custom-avatar');
    expect(avatar).toBeInTheDocument();
  });
});

describe('SkeletonMessage', () => {
  it('renders message skeleton aligned to left by default', () => {
    render(<SkeletonMessage />);
    
    const messageContainer = document.querySelector('.justify-start');
    expect(messageContainer).toBeInTheDocument();
    
    // Should have avatar for non-own messages
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();
  });

  it('renders own message skeleton aligned to right', () => {
    render(<SkeletonMessage isOwn />);
    
    const messageContainer = document.querySelector('.justify-end');
    expect(messageContainer).toBeInTheDocument();
    
    // Own messages shouldn't have avatar
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).not.toBeInTheDocument();
  });

  it('applies different background for own messages', () => {
    render(<SkeletonMessage isOwn />);
    
    const messageContent = document.querySelector('.bg-purple-600\\/20');
    expect(messageContent).toBeInTheDocument();
  });
});

describe('SkeletonChatMessages', () => {
  it('renders default number of messages', () => {
    render(<SkeletonChatMessages />);
    
    // Each message has a container with justify-start or justify-end
    const messages = document.querySelectorAll('[class*="justify-"]');
    expect(messages).toHaveLength(5); // Default count
  });

  it('renders custom number of messages', () => {
    render(<SkeletonChatMessages count={8} />);
    
    const messages = document.querySelectorAll('[class*="justify-"]');
    expect(messages).toHaveLength(8);
  });

  it('renders mix of own and other messages', () => {
    render(<SkeletonChatMessages count={4} />);
    
    const leftAligned = document.querySelectorAll('.justify-start');
    const rightAligned = document.querySelectorAll('.justify-end');
    
    // Should have a mix of left and right aligned messages
    expect(leftAligned.length + rightAligned.length).toBe(4);
    expect(leftAligned.length).toBeGreaterThan(0);
    expect(rightAligned.length).toBeGreaterThan(0);
  });
});

describe('Accessibility', () => {
  it('skeleton elements do not interfere with screen readers', () => {
    render(<SkeletonCard />);
    
    const skeletons = document.querySelectorAll('.bg-gray-700\\/50');
    skeletons.forEach(skeleton => {
      // Skeleton elements should not have any text content that would be read
      expect(skeleton.textContent).toBe('');
    });
  });

  it('skeleton containers have proper structure', () => {
    render(<SkeletonChannelList />);
    
    const container = document.querySelector('.space-y-4');
    expect(container).toBeInTheDocument();
    
    // Each card should be properly contained
    const cards = document.querySelectorAll('.bg-gray-900\\/50');
    cards.forEach(card => {
      expect(card).toHaveClass('rounded-xl');
    });
  });
});