import ora from 'ora';
import Progress from './progress';
import { toItemApiKey } from './toApiKey';

export default async ({ datoClient, contentfulData }) => {
  let spinner = ora('Fetching existing records').start();

  const records = await datoClient.items.all({}, { allPages: true });
  const itemTypes = await datoClient.itemTypes.all({}, { allPages: true });

  const importedItemTypeIds = itemTypes.filter((itemType) => {
    return contentfulData.contentTypes.some((contentType) => {
      return itemType.apiKey === toItemApiKey(contentType.sys.id);
    });
  }).map(itemType => itemType.id);

  const importedRecords = records.filter((record) => {
    return importedItemTypeIds.indexOf(record.itemType) >= 0;
  });

  spinner.succeed();

  if (importedRecords.length > 0) {
    spinner = ora('').start();

    const progress = new Progress(
      importedRecords.length,
      'Destroying existing records',
    );

    spinner.text = progress.tick();

    for (const record of records) {
      spinner.text = progress.tick();
      await datoClient.items.destroy(record.id);
    }

    spinner.succeed();
  }
};
