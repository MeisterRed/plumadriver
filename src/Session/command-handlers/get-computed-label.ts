import { NoSuchWindow } from '../../Error/errors';
import { Pluma } from '../../Types/types';

export const getComputedLabel: Pluma.CommandHandler = async ({
  session,
  urlVariables,
}) => {
  if (!session.browser.dom.window) throw new NoSuchWindow();
  return session.browser.getKnownElement(urlVariables.elementId).getLabel();
};
