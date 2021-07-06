import 'regenerator-runtime/runtime';
import { sortDocsWithLocation } from '../src/iframe/prediction';

describe('sortDocsWithLocation', () => {
  it('should show the correct main document', () => {
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
        editorUrl: 'https://360learning-marc.prismic.io/documents~c=published&l=en-us/XqazsRAAACQAXzrv/',
        id: 'XqazsRAAACQAXzrv',
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
        editorUrl: 'https://360learning-marc.prismic.io/documents~c=published&l=en-us/XqavexAAACMAXydU/',
        id: 'XqavexAAACMAXydU',
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
});
