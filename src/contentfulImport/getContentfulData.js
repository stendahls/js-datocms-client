import ora from 'ora';

export default async (client) => {
  const spinner = ora('Downloading Contentful data structure').start();
  const rawLocales = await client.getLocales();
  const defaultLocale = rawLocales.items.find(locale => locale.default).code;
  const locales = rawLocales.items.map(locale => locale.code);
  const rawContentTypes = await client.getContentTypes();
  const contentTypes = rawContentTypes.items;
  const rawEntries = await client.getEntries();
  const entries = rawEntries.items;
  const rawAssets = await client.getAssets();
  const assets = rawAssets.items;
  spinner.succeed();

  return {
    defaultLocale,
    locales,
    contentTypes,
    entries,
    assets,
  };
};
