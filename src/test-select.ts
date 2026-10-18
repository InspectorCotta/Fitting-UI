import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

export async function chooseOption(user: UserEvent, trigger: HTMLElement, label: string) {
  await user.click(trigger);
  await user.click(screen.getByRole('option', { name: label }));
}
