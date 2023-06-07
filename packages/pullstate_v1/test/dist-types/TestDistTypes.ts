import { Store, useStoreStateOpt } from "../../dist";

const obj = {
  inner: {
    something: "great",
    innerTwo: {
      isIt: true,
    },
  },
  innerArr: [{
    bogus: true,
  }],
  firstLevel: "",
};

export interface IPostSearchStore {
  posts: any[];
  currentSearchText: string;
  loadingPosts: boolean;
}

export const PostSearchStore = new Store<IPostSearchStore>({
  posts: [],
  currentSearchText: "",
  loadingPosts: false,
});

const store = new Store(obj);

const [posts, text] = useStoreStateOpt(PostSearchStore, [["posts"], ["currentSearchText"]]);

function takeString(take: string) {

}

takeString(text);
