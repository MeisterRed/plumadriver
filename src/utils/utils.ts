import { Request, Response, NextFunction } from 'express';
import { Pluma } from '../Types/types';
import * as PlumaError from '../Error/errors';
import fs from 'fs';
import has from 'has';
import isDisplayedAtom from './isdisplayed-atom.json';
import { version } from 'pjson';
import { Session } from '../Session/Session';

// credit where it's due: https://stackoverflow.com/questions/36836011/checking-validity-of-string-literal-union-type-at-runtime/43621735
export const StringUnion = <UnionType extends string>(
  ...values: UnionType[]
): {
  guard: (value: string) => value is UnionType;
  check: (value: string) => UnionType;
  values: UnionType[];
} & {
  type: UnionType;
} => {
  Object.freeze(values);
  const valueSet: Set<string> = new Set(values);

  const guard = (value: string): value is UnionType => {
    return valueSet.has(value);
  };

  const check = (value: string): UnionType => {
    if (!guard(value)) {
      const actual = JSON.stringify(value);
      const expected = values.map(s => JSON.stringify(s)).join(' | ');
      throw new TypeError(
        `Value '${actual}' is not assignable to type '${expected}'.`,
      );
    }
    return value;
  };

  const unionNamespace = { guard, check, values };
  return Object.freeze(
    unionNamespace as typeof unionNamespace & {
      type: UnionType;
    },
  );
};

export const isBrowserOptions = (
  obj: Pluma.BrowserOptions,
): obj is Pluma.BrowserOptions => {
  if (
    obj.runScripts === undefined ||
    obj.strictSSL === undefined ||
    obj.unhandledPromptBehavior === undefined ||
    obj.rejectPublicSuffixes === undefined
  )
    return false;
  return true;
};

export const validate = {
  requestBodyType(incomingMessage: Request, type: string): boolean {
    if ((incomingMessage.headers['content-type'] as string).includes(type)) {
      return true;
    }
    return false;
  },

  objectPropertiesAreInArray(
    object: Record<string, unknown>,
    array: string | string[],
  ): boolean {
    let validObject = true;

    Object.keys(object).forEach(key => {
      if (!array.includes(key)) validObject = false;
    });

    if (validObject && Object.keys(object).length > array.length)
      validObject = false;

    return validObject;
  },
  isEmpty(obj: Record<string, unknown>): boolean {
    return Object.keys(obj).length === 0;
  },
};

export const fileSystem = {
  pathExists(path: fs.PathLike): Promise<boolean> {
    return new Promise((res, rej) => {
      fs.access(path, fs.constants.F_OK, err => {
        if (err) rej(new PlumaError.InvalidArgument());
        res(true);
      });
    });
  },
};

export const endpoint = {
  sessionEndpointExceptionHandler: (
    endpointLogic: any,
    plumaCommand: string,
  ) => async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    req.sessionRequest!.command = plumaCommand;
    const release = await req.session!.mutex.acquire();
    endpointLogic(req, res)
      .catch((e: Pluma.Request) => {
        e.command = req.sessionRequest?.command || ' ';
        next(e);
      })
      .finally(() => {
        release();
      });
  },

  async defaultSessionEndpointLogic(
    req: Request,
    res: Response,
  ): Promise<void> {
    const result = await (req.session as Session).process(
      req.sessionRequest as Pluma.Request,
    );
    if (result != null) {
      res.json(has(result, 'value') ? result : { value: result });
    }
  },
};

/**
 * Selenium uses the Execute Script Sync endpoint to check for isDisplayed.
 * This detects that request and forwards it to the appropriate W3C recommended endpoint.
 */
export const handleSeleniumIsDisplayedRequest = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body.script === isDisplayedAtom) {
    const [
      { ['element-6066-11e4-a52e-4f735466cecf']: elementId },
    ] = req.body.args;

    req.url = `/session/${req.params.sessionId}/element/${elementId}/displayed`;
    req.method = 'GET';
    next('route');
  } else {
    next();
  }
};

export const isInputElement = (
  element: HTMLElement,
): element is HTMLInputElement => {
  return element.tagName.toLowerCase() === 'input';
};

export const isTextAreaElement = (
  element: HTMLElement,
): element is HTMLTextAreaElement => {
  return element.tagName.toLowerCase() === 'textarea';
};

export const isEditableFormControlElement = (
  element: HTMLInputElement | HTMLTextAreaElement,
): boolean => {
  return !element.hidden && !element.readOnly && !element.disabled;
};

export const isMutableFormControlElement = (element: HTMLElement): boolean => {
  let isMutable: boolean;

  if (isTextAreaElement(element)) {
    isMutable = isEditableFormControlElement(element);
  } else if (isInputElement(element)) {
    const mutableInputPattern = new RegExp(
      '^(text|search|url|tel|email|password|date|month|week|time|datetime-local|number|range|color|file)$',
    );
    isMutable =
      isEditableFormControlElement(element) &&
      mutableInputPattern.test(element.type);
  } else {
    isMutable = false;
  }

  return isMutable;
};

export const isMutableElement = (element: HTMLElement): boolean => {
  const {
    contentEditable,
    ownerDocument: { designMode },
  } = element;

  return contentEditable === 'true' || designMode === 'on';
};

/**
 * extracts the domain in <lowerLeveldomain>.<topLevelDomain> format
 * @returns {string}
 */
export const extractDomainFromUrl = (url: string): string => {
  return new URL(url).hostname;
};

export const isString = (candidateValue: unknown): candidateValue is string =>
  typeof candidateValue === 'string';

export const isBoolean = (candidateValue: unknown): candidateValue is boolean =>
  typeof candidateValue === 'boolean';

export const isObject = (
  candidateValue: unknown,
): candidateValue is Record<string, any> => {
  return typeof candidateValue === 'object' && candidateValue !== null;
};
// Expose the version in package.json
export const getVersion = (): string => `v${version}`;

export const isIframeElement = (
  element: HTMLElement,
): element is HTMLIFrameElement => {
  return element.localName === 'iframe';
};

export const isFrameElement = (
  element: HTMLElement,
): element is HTMLFrameElement => {
  return element.localName === 'frame';
};
