import ora from 'ora';
import Progress from './progress';
import { toItemApiKey, toFieldApiKey } from './toApiKey';
import datoFieldValidatorsFor from './datoFieldValidatorsFor';
import delay from './delay';

export default async ({
  itemTypes, fields, datoClient, contentfulData,
}) => {
  const spinner = ora('').start();
  const contentTypes = contentfulData.contentTypes;
  const fieldsSize = contentTypes
    .map(contentType => contentType.fields.length)
    .reduce((acc, length) => acc + length, 0);

  const progress = new Progress(fieldsSize, 'Adding validations on fields');
  spinner.text = progress.tick();

  for (const contentType of contentTypes) {
    const apiKey = toItemApiKey(contentType.sys.id);
    const itemType = itemTypes.find((itemType) => {
      return itemType.apiKey === apiKey;
    });

    const itemTypeFields = fields.filter((field) => {
      return field.itemType === itemType.id.toString();
    });

    for (const field of contentType.fields) {
      while (true) {
        const apiKey = toFieldApiKey(field.id);
        const datoField = itemTypeFields.find(field => field.apiKey === apiKey);
        if (!datoField) {
          return;
        }

        const validators = await datoFieldValidatorsFor({ field, itemTypes });

        try {
          await datoClient.fields.update(datoField.id, { validators });
          spinner.text = progress.tick();
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
};
