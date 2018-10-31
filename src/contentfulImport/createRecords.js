import ora from 'ora';
import Progress from './progress';
import { toItemApiKey, toFieldApiKey } from './toApiKey';
const { camelize } = require('humps');

export default async ({
  itemTypes, fields, datoClient, contentfulData,
}) => {
  const spinner = ora('').start();
  const entries = contentfulData.entries;
  const defaultLocale = contentfulData.defaultLocale;
  const progress = new Progress(entries.length, 'Creating records');

  const contentfulRecordMap = {};

  spinner.text = progress.tick();

  for (const entry of entries) {
    const contentType = entry.sys.contentType;
    const itemTypeApiKey = toItemApiKey(contentType.sys.id);

    const itemType = itemTypes.find((element) => {
      return element.apiKey === itemTypeApiKey;
    });

    const itemTypeFields = fields.filter((field) => {
      return field.itemType === itemType.id.toString();
    });

    if (itemType) {
      const emptyFieldValues = itemTypeFields.reduce((acc, field) => {
        if (field.localized) {
          const value = contentfulData.locales
            .map(locale => locale.slice(0, 2))
            .reduce((acc, locale) => Object.assign(acc, { [locale]: null }), {});
          return Object.assign(acc, { [camelize(field.apiKey)]: value });
        }
        return Object.assign(acc, { [camelize(field.apiKey)]: null });
      }, {});

      const recordAttributes = Object.entries(entry.fields).reduce((acc, [option, value]) => {
        const apiKey = toFieldApiKey(option);
        const field = itemTypeFields.find(field => field.apiKey === apiKey);
        switch (field.fieldType) {
          case 'link':
          case 'links':
          case 'image':
          case 'file':
          case 'gallery':
            return acc;
        }

        if (field.localized) {
          const localizedValue = Object.keys(value)
            .reduce((innerAcc, locale) => {
              let innerValue = value[locale];

              if (field.fieldType === 'lat_lon') {
                innerValue = {
                  latitude: innerValue.lat,
                  longitude: innerValue.lon,
                };
              }

              if (field.fieldType === 'string' && Array.isArray(innerValue)) {
                innerValue = innerValue.join(', ');
              }

              if (field.fieldType === 'json') {
                innerValue = JSON.stringify(innerValue, null, 2);
              }
              return Object.assign(innerAcc, { [locale.slice(0, 2)]: innerValue });
            }, {});

          const fallbackValues = contentfulData.locales.reduce((acc, locale) => {
            return Object.assign(acc, { [locale.slice(0, 2)]: localizedValue[defaultLocale.slice(0, 2)] });
          }, {});

          return Object.assign(acc, { [camelize(apiKey)]: { ...fallbackValues, ...localizedValue } });
        }
        let innerValue = value[defaultLocale];

        if (field.fieldType === 'lat_lon') {
          innerValue = {
            latitude: innerValue.lat,
            longitude: innerValue.lon,
          };
        }

        if (field.fieldType === 'string' && Array.isArray(innerValue)) {
          innerValue = innerValue.join(', ');
        }

        if (field.fieldType === 'json') {
          innerValue = JSON.stringify(innerValue, null, 2);
        }
        return Object.assign(acc, { [camelize(apiKey)]: innerValue });
      }, emptyFieldValues);

      try {
        const record = await datoClient.items.create({
          ...recordAttributes,
          itemType: itemType.id.toString(),
        });

        spinner.text = progress.tick();
        contentfulRecordMap[entry.sys.id] = record.id;
      } catch (e) {
        if (
          e.body
            && e.body.data
            && e.body.data.some(d => d.id === 'ITEMS_QUOTA_EXCEEDED')
        ) {
          spinner.fail('You\'ve reached your site\'s plan record limit: upgrade to complete the import');
        } else {
          spinner.fail(e);
        }
        process.exit();
      }
    }
  }

  spinner.succeed();

  return contentfulRecordMap;
};
