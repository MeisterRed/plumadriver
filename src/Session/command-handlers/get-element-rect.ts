import { NoSuchWindow } from '../../Error/errors';
import Pluma from '../../Types/types';

const getElementLabel: Pluma.CommandHandler = async ({
  session,
  urlVariables,
}) => {
  if (!session.browser.dom.window) throw new NoSuchWindow();
  const x = session.browser.getWindowCordX();
  const y = session.browser.getWindowCordY();
  return session.browser
    .getKnownElement(urlVariables.elementId)
    .calculateRect(x, y);
};

export default getElementLabel;
