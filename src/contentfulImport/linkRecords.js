import ora from 'ora';
import Progress from './progress';
import { toItemApiKey, toFieldApiKey } from './toApiKey';

export default async ({
  itemTypes,
  fields,
  datoClient,
  contentfulData,
  contentfulRecordMap,
}) => {
  const spinner = ora('').start();
  const entries = contentfulData.entries;
  const progress = new Progress(entries.length, 'Linking records');
  const defaultLocale = contentfulData.defaultLocale;
  const { camelize } = require('humps');

  spinner.text = progress.tick();

  for (const entry of entries) {
    const contentType = entry.sys.contentType;
    const itemTypeApiKey = toItemApiKey(contentType.sys.id);
    const itemType = itemTypes.find((element) => {
      return element.apiKey === itemTypeApiKey;
    });

    if (!itemType) {
      spinner.fail(`Item type ${itemTypeApiKey} not found`);
      return;
    }

    const datoItemId = contentfulRecordMap[entry.sys.id];

    const itemTypeFields = fields.filter((field) => {
      return field.itemType === itemType.id.toString();
    });

    const recordAttributes = Object.entries(entry.fields).reduce((acc, [option, value]) => {
      const apiKey = toFieldApiKey(option);
      const field = itemTypeFields.find(field => field.apiKey === apiKey);

      if (field.fieldType !== 'link' && field.fieldType !== 'links') {
        return acc;
      }

      if (field.localized) {
        const localizedValue = Object.keys(value)
          .reduce((innerAcc, locale) => {
            const innerValue = value[locale];
            if (field.fieldType === 'link') {
              return Object.assign(innerAcc, { [locale.slice(0, 2)]: contentfulRecordMap[innerValue.sys.id] });
            }
            return Object.assign(innerAcc, {
              [locale.slice(0, 2)]: innerValue.map(link => contentfulRecordMap[link.sys.id]),
            });
          }, {});
        const fallbackValues = contentfulData.locales.reduce((acc, locale) => {
          return Object.assign(acc, { [locale.slice(0, 2)]: localizedValue[defaultLocale.slice(0, 2)] });
        }, {});

        return Object.assign(acc, { [camelize(apiKey)]: { ...fallbackValues, ...localizedValue } });
      }
      const innerValue = value[defaultLocale];
      if (field.fieldType === 'link') {
        return Object.assign(acc, { [camelize(apiKey)]: contentfulRecordMap[innerValue.sys.id] });
      }
      return Object.assign(acc, {
        [camelize(apiKey)]: innerValue.map(link => contentfulRecordMap[link.sys.id]),
      });
    }, {});

    try {
      await datoClient.items.update(datoItemId, recordAttributes);
      spinner.text = progress.tick();
    } catch (e) {
      spinner.fail(e);
      process.exit();
    }

    spinner.text = progress.tick();
  }

  spinner.succeed();
  return 0;
};
