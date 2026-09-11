import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/status-badge';

describe('StatusBadge', () => {
  it('renders a distinct label for every component state', () => {
    const cases = [
      { state: 'up', label: 'Operational' },
      { state: 'degraded', label: 'Degraded' },
      { state: 'down', label: 'Unavailable' },
      { state: 'unknown', label: 'Unknown' },
    ] as const;

    for (const testCase of cases) {
      const { unmount } = render(<StatusBadge state={testCase.state} label="database" />);
      expect(screen.getByTestId('status-badge')).toHaveTextContent(testCase.label);
      expect(screen.getByTestId('status-badge')).toHaveAttribute('data-state', testCase.state);
      unmount();
    }
  });

  it('exposes an accessible name combining label and state', () => {
    render(<StatusBadge state="down" label="redis" />);
    expect(screen.getByText('redis: Unavailable')).toBeInTheDocument();
  });

  it('shows probe latency only when it is known', () => {
    const { rerender } = render(<StatusBadge state="up" label="database" latencyMs={1.234} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('1.2 ms');

    rerender(<StatusBadge state="down" label="database" latencyMs={null} />);
    expect(screen.getByTestId('status-badge')).not.toHaveTextContent('ms');
  });
});
