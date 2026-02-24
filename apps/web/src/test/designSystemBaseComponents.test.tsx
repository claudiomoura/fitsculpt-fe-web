import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge, Button, Card, ExerciseCard, MealCard, NavItem, ProgressBar } from '@/design-system/components';

describe('design-system base components', () => {
  it('renders button variants and states', () => {
    const { getByRole } = render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </>,
    );

    expect(getByRole('button', { name: 'Primary' })).toHaveClass('bg-primary');
    expect(getByRole('button', { name: 'Secondary' })).toHaveClass('border-border');
    expect(getByRole('button', { name: 'Ghost' })).toHaveClass('bg-transparent');
    expect(getByRole('button', { name: 'Disabled' })).toBeDisabled();
    expect(getByRole('button', { name: 'Loading' })).toBeDisabled();
  });

  it('renders card, badge and nav item variants', () => {
    const { getByRole, getByTestId, getByText } = render(
      <>
        <Card data-testid="default-card" />
        <Card data-testid="elevated-card" variant="elevated" />
        <Badge>Pro</Badge>
        <Badge variant="muscleTag">Muscle</Badge>
        <NavItem href="#">Default</NavItem>
        <NavItem href="#" variant="active">
          Active
        </NavItem>
      </>,
    );

    expect(getByTestId('default-card')).toHaveClass('border-border');
    expect(getByTestId('elevated-card')).toHaveClass('shadow-md');
    expect(getByText('Pro')).toHaveClass('text-primary');
    expect(getByText('Muscle')).toHaveClass('text-text');
    expect(getByRole('link', { name: 'Default' })).toHaveClass('text-text-muted');
    expect(getByRole('link', { name: 'Active' })).toHaveClass('text-primary');
  });

  it('renders progress and card state variants', () => {
    const { getAllByRole, getByRole, getByText } = render(
      <>
        <ProgressBar value={24} />
        <ProgressBar value={100} variant="complete" />
        <ExerciseCard title="Bench" progress={40} />
        <ExerciseCard title="Row" variant="active" />
        <ExerciseCard title="Deadlift" variant="completed" />
        <MealCard title="Meal" />
        <MealCard title="Selected Meal" variant="selected" />
      </>,
    );

    expect(getAllByRole('progressbar').length).toBeGreaterThanOrEqual(2);
    expect(getByRole('button', { name: /Bench/ })).toHaveClass('border-border');
    expect(getByRole('button', { name: 'Row' })).toHaveClass('border-primary/45');
    expect(getByText('Done')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Meal' })).toHaveClass('border-border');
    expect(getByText('Selected')).toBeInTheDocument();
  });
});
