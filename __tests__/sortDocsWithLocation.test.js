import 'regenerator-runtime/runtime';
import { sortDocsWithLocation } from '../src/iframe/prediction';

describe('sortDocsWithLocation', () => {
  test('should show the correct main document', () => {
    const location = {
      "href": "http://localhost:3000/blog",
      "ancestorOrigins": {},
      "origin": "http://localhost:3000",
      "protocol": "http:",
      "host": "localhost:3000",
      "hostname": "localhost",
      "port": "3000",
      "pathname": "/blog",
      "search": "",
      "hash": ""
    };
    const wrongOrder = [
      {
        editorUrl: 'https://fsake.prismic.io/documents~c=published&l=en-us/shouldbesecond/',
        id: 'shouldbesecond',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Categories',
        title: 'Navbar',
        updated: 1625563799012,
        urls: ['/blog'],
        weight: 3,
      },
      {
        editorUrl: 'https://fake.prismic.io/documents~c=published&l=en-us/shouldbefirst/',
        id: 'shouldbefirst',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Featured',
        title: 'Blog Home',
        updated: 1625563799291,
        urls: ['/blog'],
        weight: 3,
      }
    ];

    const result = sortDocsWithLocation(wrongOrder, location);

    expect(result[0].title).toBe('Blog Home');
  });

  test('when records are similar it will try try and match the pathname', () => {
    const location = {
      "href": "http://localhost:3000/blog",
      "ancestorOrigins": {},
      "origin": "http://localhost:3000",
      "protocol": "http:",
      "host": "localhost:3000",
      "hostname": "localhost",
      "port": "3000",
      "pathname": "/blog",
      "search": "",
      "hash": ""
    };

    const wrongOrder = [
      {
        editorUrl: 'https://fsake.prismic.io/documents~c=published&l=en-us/shouldbesecond/',
        id: 'shouldbesecond',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Categories',
        title: 'Navbar',
        updated: 0,
        urls: ['/blog'],
        weight: 3,
      },
      {
        editorUrl: 'https://fake.prismic.io/documents~c=published&l=en-us/shouldbefirst/',
        id: 'shouldbefirst',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Featured',
        title: 'Blog Home',
        updated: 0,
        urls: ['/blog'],
        weight: 3,
      }
    ];

    const result = sortDocsWithLocation(wrongOrder, location);

    expect(result[0].title).toBe('Blog Home');
  });

  test('title matching with the location pathname should supersede date', () => {
    const location = {
      "href": "http://localhost:3000/blog",
      "ancestorOrigins": {},
      "origin": "http://localhost:3000",
      "protocol": "http:",
      "host": "localhost:3000",
      "hostname": "localhost",
      "port": "3000",
      "pathname": "/blog",
      "search": "",
      "hash": ""
    };
    const docs = [
      {
        editorUrl: 'https://fsake.prismic.io/documents~c=published&l=en-us/shouldbesecond/',
        id: 'shouldbesecond',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Categories',
        title: 'Navbar',
        updated: 1,
        urls: ['/blog'],
        weight: 3,
      },
      {
        editorUrl: 'https://fake.prismic.io/documents~c=published&l=en-us/shouldbefirst/',
        id: 'shouldbefirst',
        isDocumentLink: false,
        queryTotal: 1,
        singleton: true,
        status: 'live',
        summary: 'Featured',
        title: 'Blog Home',
        updated: 0,
        urls: ['/blog'],
        weight: 3,
      }
    ];

    const result = sortDocsWithLocation(docs, location);

    expect(result[0].title).toBe('Blog Home');
  })
});
