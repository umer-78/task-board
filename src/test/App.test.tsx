import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../lib/storage';

describe('the board in a browser', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a short sample board', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Task Board' })).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 done/)).toBeInTheDocument();
  });

  it('adds a task with inline tags and saves it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('New task'), 'Write the README #docs{Enter}');
    expect(screen.getByText('Write the README')).toBeInTheDocument();
    expect(screen.getAllByText('#docs').length).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Write the README');
  });

  it('moves a task with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const todo = screen.getByRole('region', { name: 'To do' });
    const card = within(todo).getByRole('article', { name: /Read the README/ });
    card.focus();
    await user.keyboard('{ArrowRight}');
    const doing = screen.getByRole('region', { name: 'Doing' });
    expect(within(doing).getByRole('article', { name: /Read the README/ })).toBeInTheDocument();
  });

  it('filters by tag', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Filter tasks'), '#local');
    expect(screen.getByText(/Everything is saved/)).toBeInTheDocument();
    expect(screen.queryByText('Read the README')).not.toBeInTheDocument();
  });

  it('edits a task inline', async () => {
    const user = userEvent.setup();
    render(<App />);
    const card = screen.getByRole('article', { name: /Read the README/ });
    card.focus();
    await user.keyboard('{Enter}');
    const input = screen.getByLabelText('Title');
    await user.clear(input);
    await user.type(input, 'Read the docs{Enter}');
    expect(screen.getByText('Read the docs')).toBeInTheDocument();
  });

  it('clears the done column', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Clear done' }));
    expect(screen.getByText(/0 of 2 done/)).toBeInTheDocument();
  });
});
