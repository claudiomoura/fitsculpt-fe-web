import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartContainer, InsightPanel, StatCard } from '@/design-system';

describe('dashboard ui kit components', () => {
  it('renders StatCard content and tokenized structure', () => {
    const { getByTestId, getByText } = render(
      <StatCard data-testid="stat-card" label="Weekly volume" value="12,450 kg" trend="+8% vs last week" />,
    );

    expect(getByTestId('stat-card')).toHaveClass('rounded-xl', 'border', 'bg-surface', 'p-6');
    expect(getByText('Weekly volume')).toBeInTheDocument();
    expect(getByText('12,450 kg')).toBeInTheDocument();
    expect(getByText('+8% vs last week')).toHaveClass('text-text-muted');
  });

  it('renders InsightPanel with accent tone and action region', () => {
    const { getByText } = render(
      <InsightPanel
        title="Recovery status"
        description="Your HRV trend suggests a lighter session today."
        tone="success"
        action={<button type="button">View recommendation</button>}
      />,
    );

    expect(getByText('Recovery status')).toBeInTheDocument();
    expect(getByText('View recommendation')).toBeInTheDocument();
  });

  it('renders ChartContainer empty state and sizing classes', () => {
    const { getByTestId, getByRole, getByText } = render(
      <ChartContainer
        data-testid="chart"
        title="Weekly trend"
        description="Load progression over seven days"
        size="lg"
      />,
    );

    expect(getByTestId('chart')).toHaveClass('rounded-2xl', 'border', 'bg-surface', 'p-6');
    expect(getByText('No chart data available.')).toBeInTheDocument();
    expect(getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
