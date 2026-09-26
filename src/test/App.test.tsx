import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../lib/storage';

// The done/total figures are animated number tickers inside the summary
// line, so match the line's whole text rather than one text node.
const summaryLine = (re: RegExp) => (_: string, el: Element | null) => el?.tagName === 'P' && re.test(el.textContent ?? '');

describe('the board in a browser', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a short sample board', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Task Board' })).toBeInTheDocument();
    expect(screen.getByText(summaryLine(/1 of 3 done/))).toBeInTheDocument();
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
    const moved = within(doing).getByRole('article', { name: /Read the README/ });
    expect(moved).toBeInTheDocument();
    // Focus follows the card, so pressing → again keeps moving the same one.
    expect(moved).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    const done = screen.getByRole('region', { name: 'Done' });
    expect(within(done).getByRole('article', { name: /Read the README/ })).toHaveFocus();
  });

  it('removes a deleted card from the board', async () => {
    const user = userEvent.setup();
    render(<App />);
    const card = screen.getByRole('article', { name: /Read the README/ });
    card.focus();
    await user.keyboard('{Delete}');
    await waitFor(() => expect(screen.queryByText('Read the README')).not.toBeInTheDocument());
    expect(screen.getByText(summaryLine(/1 of 2 done/))).toBeInTheDocument();
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
    expect(screen.getByText(summaryLine(/0 of 2 done/))).toBeInTheDocument();
  });
});
