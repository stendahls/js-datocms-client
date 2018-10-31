import ora from 'ora';
import Progress from './progress';

export default async ({ datoClient, contentfulData }) => {
  let spinner = ora('Fetching for useless assets').start();

  const uploads = await datoClient.uploads.all({ 'filter[type]': 'not_used' }, { allPages: true });
  const assets = contentfulData.assets;

  spinner.succeed();

  if (uploads.length > 0) {
    const progress = new Progress(uploads.length, 'Destroying existing assets');
    spinner = ora('').start();
    spinner.text = progress.tick();

    for (const upload of uploads) {
      try {
        await datoClient.uploads.destroy(upload.id);
        spinner.text = progress.tick();
      } catch (e) {
        spinner.fail(e);
        process.exit();
      }
    }

    spinner.succeed();
  }
};
