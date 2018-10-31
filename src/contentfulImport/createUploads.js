import ora from 'ora';
import Progress from './progress';
import {
  toItemApiKey,
  toFieldApiKey,
} from './toApiKey';
const { camelize } = require('humps');

export default async ({
  fields,
  itemTypes,
  datoClient,
  contentfulData,
  contentfulRecordMap,
}) => {
  let spinner = ora('').start();
  const entries = contentfulData.entries;
  const assets = contentfulData.assets;
  const defaultLocale = contentfulData.defaultLocale;

  let progress = new Progress(assets.length, 'Uploading assets');
  spinner.text = progress.tick();

  const contentfulAssetsMap = {};

  for (const asset of assets) {
    if (asset.fields && asset.fields.file) {
      const fileAttributes = asset.fields.file[defaultLocale];
      const fileUrl = `https:${fileAttributes.url}`;
      let datoUpload;
      let upload;

      try {
        if (fileAttributes.contentType.match(/^image\//)) {
          datoUpload = await datoClient.uploadImage(fileUrl);
        } else {
          datoUpload = await datoClient.uploadFile(fileUrl);
        }

        upload = await datoClient.uploads.update(datoUpload, {
          title: fileAttributes.fileName,
          alt: fileAttributes.fileName,
        });

        contentfulAssetsMap[asset.sys.id] = upload.id;
        spinner.text = progress.tick();
      } catch (e) {
        if (
          e.body
            && e.body.data
            && e.body.data.some(d => d.id === 'FILE_STORAGE_QUOTA_EXCEEDED')
        ) {
          spinner.fail('You\'ve reached your site\'s plan storage limit: upgrade to complete the import');
        } else {
          spinner.fail(e);
        }
        process.exit();
      }
    } else {
      console.log(asset);
      spinner.text = process.tick();
    }
  }

  spinner.succeed();

  spinner = ora('').start();
  progress = new Progress(entries.length, 'Linking assets to records');
  spinner.text = progress.tick();

  for (const entry of entries) {
    const contentType = entry.sys.contentType;
    const itemTypeApiKey = toItemApiKey(contentType.sys.id);
    const itemType = itemTypes.find((element) => {
      return element.apiKey === itemTypeApiKey;
    });

    const itemTypeFields = fields.filter(field => field.itemType === itemType.id.toString());

    const datoItemId = contentfulRecordMap[entry.sys.id];
    let recordAttributes = {};

    for (const key of Object.keys(entry.fields)) {
      const value = entry.fields[key];
      const apiKey = toFieldApiKey(key);
      const field = fields.find(field => field.apiKey === apiKey);

      const linkValue = null;
      const sourceFile = null;
      const fileUrl = null;
      let uploadedFile = null;

      if (field.fieldType !== 'file' && field.fieldType !== 'image' && field.fieldType !== 'gallery') {
        continue;
      }

      if (field.localized) {
        const localizedValue = Object.keys(value)
          .reduce((innerAcc, locale) => {
            const innerValue = value[locale];
            if (field.fieldType === 'file' || field.fieldType === 'image') {
              return Object.assign(innerAcc, { [locale.slice(0, 2)]: contentfulAssetsMap[innerValue.sys.id] });
            }
            return Object.assign(innerAcc, {
              [locale.slice(0, 2)]: innerValue.map(link => contentfulAssetsMap[link.sys.id]),
            });
          }, {});
        const fallbackValues = contentfulData.locales.reduce((innerAcc, locale) => {
          return Object.assign(innerAcc, { [locale.slice(0, 2)]: localizedValue[defaultLocale.slice(0, 2)] });
        }, {});


        recordAttributes = Object.assign(recordAttributes, { [apiKey]: { ...fallbackValues, ...localizedValue } });
      } else {
        const innerValue = value[defaultLocale];

        switch (field.fieldType) {
          case 'file':
          case 'image':
            uploadedFile = contentfulAssetsMap[innerValue.sys.id];
            break;
          case 'gallery':
            uploadedFile = innerValue.map((link) => {
              return contentfulAssetsMa[link.sys.id];
            });
            break;
        }

        recordAttributes = Object.assign(recordAttributes, {
          [camelize(apiKey)]: uploadedFile,
        });
      }
    }
    try {
      await datoClient.items.update(datoItemId, recordAttributes);
      spinner.text = progress.tick();
    } catch (e) {
      spinner.fail(e);
      process.exit();
    }
  }

  spinner.succeed();
};
