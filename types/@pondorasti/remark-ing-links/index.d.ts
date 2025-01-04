declare module "@pondorasti/remark-img-links" {
  import { Plugin } from 'unified';

  interface ImgLinksOptions {
    absolutePath: string;
  }

  const imgLinks: Plugin<[ImgLinksOptions?]>;

  export default imgLinks;
}
