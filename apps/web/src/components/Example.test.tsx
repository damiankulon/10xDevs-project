import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Example component test
// Replace with your actual component
const ExampleComponent = () => {
  return (
    <div>
      <h1>Hello Kipio</h1>
      <button>Click me</button>
    </div>
  );
};

describe('ExampleComponent', () => {
  it('renders heading', () => {
    render(<ExampleComponent />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hello Kipio');
  });

  it('renders button', () => {
    render(<ExampleComponent />);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });
});
