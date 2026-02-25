import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageContainer, Stack } from '@/design-system';

describe('design-system layout primitives', () => {
  it('renders PageContainer with responsive spacing scale defaults', () => {
    const { getByTestId } = render(<PageContainer data-testid="page" />);

    expect(getByTestId('page')).toHaveClass('px-8', 'md:px-16', 'lg:px-24', 'max-w-screen-xl');
  });

  it('renders Stack using spacing aliases and layout props', () => {
    const { getByTestId } = render(
      <Stack data-testid="stack" gap="md" direction="horizontal" align="center" justify="between" wrap />,
    );

    expect(getByTestId('stack')).toHaveClass(
      'gap-24',
      'flex-row',
      'items-center',
      'justify-between',
      'flex-wrap',
    );
  });
});
