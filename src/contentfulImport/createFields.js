import ora from 'ora';
import Progress from './progress';
import { toItemApiKey, toFieldApiKey } from './toApiKey';
import datoFieldTypeFor from './datoFieldTypeFor';
import datoLinkItemTypeFor from './datoLinkItemTypeFor';
import delay from './delay';

export default async ({ itemTypes, datoClient, contentfulData }) => {
  const spinner = ora('').start();
  const contentTypes = contentfulData.contentTypes;
  const fieldSize = contentTypes
    .map(contentType => contentType.fields.length)
    .reduce((acc, length) => acc + length, 0);

  const progress = new Progress(fieldSize, 'Creating fields');
  spinner.text = progress.tick();

  const fields = [];

  for (const contentType of contentTypes) {
    const apiKey = toItemApiKey(contentType.sys.id);
    const itemType = itemTypes.find((itemType) => {
      return itemType.apiKey === apiKey;
    });

    for (const field of contentType.fields) {
      const position = contentType.fields.indexOf(field);
      let validators = {};


      if (field.type === 'Link' && field.linkType === 'Entry') {
        validators = {
          itemItemType: {
            itemTypes: datoLinkItemTypeFor({ itemTypes, field }),
          },
        };
      }

      if (
        field.type === 'Array'
          && field.items.type === 'Link'
          && field.items.linkType === 'Entry'
      ) {
        validators = {
          itemsItemType: {
            itemTypes: datoLinkItemTypeFor({ itemTypes, field: field.items }),
          },
        };
      }

      const fieldAttributes = {
        label: field.name,
        fieldType: datoFieldTypeFor(field),
        localized: field.localized,
        apiKey: toFieldApiKey(field.id),
        position,
        validators,
      };

      if (field.id === contentType.displayField && field.type === 'Symbol') {
        fieldAttributes.appeareance = { editor: 'single_line', parameters: { heading: true }, addons: [] };
      }

      while (true) {
        try {
          const datoField = await datoClient.fields.create(itemType.id, fieldAttributes);
          spinner.text = progress.tick();
          fields.push(datoField);
          break;
        } catch (e) {
          if (
            !e.body
              || !e.body.data
              || !e.body.data.some(d => d.id === 'BATCH_DATA_VALIDATION_IN_PROGRESS')
          ) {
            spinner.fail(e);
            process.exit();
          } else {
            await delay(1000);
          }
        }
      }
    }
  }

  spinner.succeed();

  return fields;
};
