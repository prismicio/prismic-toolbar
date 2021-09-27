import 'regenerator-runtime/runtime';
import * as Prediction from '../src/iframe/prediction';
import * as common from '../src/common';

jest.mock('../src/common', () => ({
  ...(jest.requireActual('../src/common')),
  fetchy: jest.fn(),
}));

function fillUrls(n) {
  return Array(n).fill('https://prismic.io/docs/technologies/how-to-query-the-api-javascript');
}

function generateDoc({ weight, urls, uid, title = 'foo' }) {
  return {
    id: 'xxxxxxxx',
    urls: fillUrls(urls),
    weight,
    uid,
    editorUrl: '/documents~c=published&l=en-us/xxxxxxxx/',
    title,
  };
}

test('predict main document using urls counter', async () => {
  const mainDocument = generateDoc({ weight: 1, uid: 'javascript', urls: 1 });

  common.fetchy.mockResolvedValue({
    documents: [
      generateDoc({ weight: 1, uid: 'php', urls: 7 }),
      generateDoc({ weight: 1, uid: 'java', urls: 21 }),
      mainDocument,
    ]
  });

  const documents = await Prediction.getDocuments({
    url: 'xxxxxxxx',
    ref: 'xxxxxxxx',
    tracker: 'xxxxxxx',
    location: {
      href: 'https://prismic.io/docs/technologies/how-to-query-the-api-javascript',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: '/docs/technologies/how-to-query-the-api-javascript',
      search: '',
      hash: ''
    }
  });

  expect(documents[0].uid).toBe('javascript');
});

test('predict main document using uid in the path name', async () => {
  const mainDocument = generateDoc({ weight: 1, uid: 'how-to-query-the-api-javascript', urls: 27 });

  common.fetchy.mockResolvedValue({
    documents: [
      generateDoc({ weight: 1, uid: 'php', urls: 7 }),
      generateDoc({ weight: 1, uid: 'java', urls: 21 }),
      mainDocument,
    ]
  });

  const documents = await Prediction.getDocuments({
    url: 'xxxxxxxx',
    ref: 'xxxxxxxx',
    tracker: 'xxxxxxx',
    location: {
      href: 'https://prismic.io/docs/technologies/how-to-query-the-api-javascript',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: '/docs/technologies/how-to-query-the-api-javascript',
      search: '',
      hash: ''
    }
  });

  expect(documents[0].uid).toBe('how-to-query-the-api-javascript');
});

test('predict main document using uid in the hash', async () => {
  const mainDocument = generateDoc({ weight: 1, uid: 'how-to-query-the-api-javascript', urls: 27 });

  common.fetchy.mockResolvedValue({
    documents: [
      generateDoc({ weight: 1, uid: 'php', urls: 7 }),
      generateDoc({ weight: 1, uid: 'java', urls: 21 }),
      mainDocument,
    ]
  });

  const documents = await Prediction.getDocuments({
    url: 'xxxxxxxx',
    ref: 'xxxxxxxx',
    tracker: 'xxxxxxx',
    location: {
      href: 'https://prismic.io/#/docs/technologies/how-to-query-the-api-javascript',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: '',
      search: '',
      hash: '#/docs/technologies/how-to-query-the-api-javascript'
    }
  });

  expect(documents[0].uid).toBe('how-to-query-the-api-javascript');
});

test('predict main document using uid in the hash but as a querystring', async () => {
  const mainDocument = generateDoc({ weight: 1, uid: 'how-to-query-the-api-javascript', urls: 27 });

  common.fetchy.mockResolvedValue({
    documents: [
      generateDoc({ weight: 1, uid: 'php', urls: 7 }),
      generateDoc({ weight: 1, uid: 'java', urls: 21 }),
      mainDocument,
    ]
  });

  const documents = await Prediction.getDocuments({
    url: 'xxxxxxxx',
    ref: 'xxxxxxxx',
    tracker: 'xxxxxxx',
    location: {
      href: 'https://prismic.io/#/docs/technologies?uid=how-to-query-the-api-javascript',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: '',
      search: '',
      hash: '#/docs/technologies?uid=how-to-query-the-api-javascript'
    }
  });

  expect(documents[0].uid).toBe('how-to-query-the-api-javascript');
});

test('predict main document using uid in the querystring', async () => {
  const mainDocument = generateDoc({ weight: 1, uid: 'how-to-query-the-api-javascript', urls: 27 });

  common.fetchy.mockResolvedValue({
    documents: [
      generateDoc({ weight: 1, uid: 'php', urls: 7 }),
      generateDoc({ weight: 1, uid: 'java', urls: 21 }),
      mainDocument,
    ]
  });

  const documents = await Prediction.getDocuments({
    url: 'xxxxxxxx',
    ref: 'xxxxxxxx',
    tracker: 'xxxxxxx',
    location: {
      href: 'https://prismic.io/docs/technologies?uid=how-to-query-the-api-javascript',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: 'https://prismic.io/docs/technologies',
      search: '?uid=how-to-query-the-api-javascript',
      hash: ''
    }
  });

  expect(documents[0].uid).toBe('how-to-query-the-api-javascript');
});


describe('Priority checks', () => {
  test('exact uid matches over title matches', async () => {
    const mainDocument = generateDoc({ weight: 1, urls: 1, uid: 'foo-bar', title: 'uid' });
    const docs = [
      generateDoc({ weight: 1, urls: 1, uid: '', title: 'foo-bar' }),
      mainDocument,
    ];

    common.fetchy.mockResolvedValue({ documents: docs });

    const location = {
      href: 'https://prismic.io/docs/technologies/foo-bar',
      origin: 'https://prismic.io',
      protocol: 'https:',
      host: 'prismic.io',
      hostname: 'prismic.io',
      port: '',
      pathname: '/docs/technologies/foo-bar',
      hash: '',
      search: '',
    };

    const documents = await Prediction.getDocuments({
      url: 'xxxxxxxx',
      ref: 'xxxxxxxx',
      tracker: 'xxxxxxx',
      location,
    });
    expect(documents[0].title).toBe('uid');
  });
});
