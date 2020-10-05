import validator from 'validator';
import has from 'has';
import { validate } from '../utils/utils';
import {
  unhandledPromptBehaviorValues,
  PageLoadStrategyValues,
  TimeoutValues,
} from '../constants/constants';
import { isObject } from '../utils/utils';
//import { isObject } from '../Browser/Browser';

/**
 * Validates webdriver and jsdom capabilities before they are used to configure a given session and/or user agent
 * valid property
 */
class CapabilityValidator {
  /** set to true until a capability is deemed invalid. Prevents any further
   * validation when set to false.
   */
  valid: boolean;

  constructor() {
    this.valid = true;
  }

  /**
   * validates any given plumadriver capability
   * @param capability the capability object
   * @param capabilityName the name of the capability to be validated
   */
  validate(capability: unknown, capabilityName: string): boolean {
    switch (capabilityName) {
      case 'browserName':
      case 'browserVersion':
      case 'platformName':
        this.valid = typeof capability === 'string';
        break;
      case 'acceptInsecureCerts':
        this.valid = typeof capability === 'boolean';
        break;
      case 'pageLoadStrategy':
        this.valid = typeof capability === 'string';
        this.valid = this.valid
          ? PageLoadStrategyValues.guard(capability as string)
          : this.valid;

        break;
      case 'unhandledPromptBehavior':
        this.valid = typeof capability === 'string';
        this.valid = this.valid
          ? unhandledPromptBehaviorValues.guard(capability as string)
          : this.valid;
        break;
      case 'proxy':
        this.valid =
          isObject(capability) && CapabilityValidator.validateProxy(capability);
        break;
      case 'timeouts':
        this.valid =
          isObject(capability) &&
          Object.entries(capability).every(e => this.validateTimeouts(...e));
        break;
      case 'plm:plumaOptions':
        this.valid =
          isObject(capability) &&
          CapabilityValidator.validatePlumaOptions(capability);
        break;
      default:
        this.valid = false;
        break;
    }
    return this.valid;
  }

  /**
   * validates proxy for session
   */
  static validateProxy(reqProxy: Record<string, any>): boolean {
    const proxyProperties = [
      'proxyType',
      'proxyAutoConfigUrl',
      'ftpProxy',
      'httpProxy',
      'noProxy',
      'sslProxy',
      'socksProxy',
      'socksVersion',
    ];

    let validProxy = true;

    validProxy = !validate.isEmpty(reqProxy);

    if (validProxy) {
      Object.keys(reqProxy).forEach(key => {
        if (validProxy) {
          if (!proxyProperties.includes(key)) {
            validProxy = false;
          } else {
            switch (key) {
              case 'proxyType':
                if (reqProxy[key] === 'pac') {
                  validProxy = has(reqProxy, 'proxyAutoConfigUrl');
                } else if (
                  reqProxy[key] !== 'direct' &&
                  reqProxy[key] !== 'autodetect' &&
                  reqProxy[key] !== 'system' &&
                  reqProxy[key] !== 'manual'
                )
                  validProxy = false;
                break;
              case 'proxyAutoConfigUrl':
                validProxy = validProxy
                  ? validator.isURL(reqProxy[key])
                  : validProxy;
                break;
              case 'ftpProxy':
              case 'httpProxy':
              case 'sslProxy':
                validProxy = reqProxy.proxyType === 'manual';
                validProxy = validProxy
                  ? validator.isURL(reqProxy[key])
                  : validProxy;

                break;
              case 'socksProxy':
                validProxy = reqProxy.proxyType === 'manual';
                validProxy = validProxy
                  ? has(reqProxy, 'socksVersion')
                  : validProxy;

                validProxy = validProxy
                  ? validator.isURL(reqProxy[key])
                  : validProxy;
                break;
              case 'socksVersion':
                validProxy = reqProxy.proxyType === 'manual';
                validProxy = validProxy
                  ? Number.isInteger(reqProxy[key]) &&
                    reqProxy[key] > -1 &&
                    reqProxy[key] < 256
                  : validProxy;
                break;
              case 'noProxy':
                validProxy = reqProxy[key] instanceof Array;
                if (validProxy) {
                  (reqProxy[key] as string[]).forEach((url: string) => {
                    if (validProxy) validProxy = validator.isURL(url);
                  });
                }
                break;
              default:
                validProxy = false;
            }
          }
        }
      });
    }
    return validProxy;
  }

  /**
   * validates timeouts based on their type
   * @param key the type of timeout to validate
   * @param value the value of the given timeout
   */
  validateTimeouts(key: string, value: number): boolean {
    this.valid =
      TimeoutValues.guard(key) && Number.isInteger(value) && value >= 0
        ? true
        : false;

    return this.valid;
  }

  /**
   * Validates plumadriver specific options
   * @param options vendor (plumadriver) specific options
   */
  static validatePlumaOptions(options: Record<string, any>): boolean {
    let validatedOptions = true;

    const allowedOptions: Record<string, any> = {
      url(url: string): boolean {
        return validator.isURL(url);
      },
      referrer(referrer: string): boolean {
        return validator.isURL(referrer);
      },
      contentType(contentType: string): boolean {
        let valid;
        const validTypes = ['text/html', 'application/xml'];

        if (contentType.constructor === String) valid = true;
        else valid = false;

        if (
          validTypes.includes(contentType) ||
          contentType.substr(contentType.length - 4) === '+xml'
        ) {
          valid = true;
        } else valid = false;

        return valid;
      },
      includeNodeLocations(value: Record<string, unknown>): boolean {
        return value.constructor === Boolean;
      },
      storageQuota(quota: number): boolean {
        return Number.isInteger(quota);
      },
      runScripts(value: Record<string, any>): boolean {
        return value.constructor === Boolean;
      },
      resources(resources: string): boolean {
        return resources.constructor === String && resources === 'useable';
      },
      rejectPublicSuffixes(value: Record<string, any>): boolean {
        return value.constructor === Boolean;
      },
    };

    Object.keys(options).forEach(key => {
      if (!Object.keys(allowedOptions).includes(key)) validatedOptions = false;
      if (validatedOptions) {
        try {
          validatedOptions = allowedOptions[key](options[key]);
        } catch (err) {
          validatedOptions = false;
        }
      }
    });
    return validatedOptions;
  }
}

export { CapabilityValidator };
