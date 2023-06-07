import { Store } from "../src/Store";
import { nanoid } from "nanoid";

interface ITask {
  id: string;
  done: boolean;
  dateUpdated: Date;
  dateCreated: Date;
  priority: number;
  text: string;
  tags: string[];
}

interface IAppState {
  profile: {
    username: string;
    dateCreated: Date;
    tasks: ITask[];
  };
}

function createTask(partial: Partial<ITask> = {}): ITask {
  return {
    id: nanoid(10),
    done: false,
    dateUpdated: new Date(),
    dateCreated: new Date(),
    priority: Math.floor(Math.random() * 10),
    text: Math.random().toString(),
    tags: ["food", "shopping"],
    ...partial,
  };
}

const AppStore = new Store<IAppState>({
  profile: {
    username: "beans",
    tasks: [
      createTask({ text: "Buy Chocolate" }),
      createTask({ tags: [], text: "Phone mom" }),
      createTask({
        tags: ["sport"],
        text: "Join Gym",
      }),
    ],
    dateCreated: new Date(),
  },
});

AppStore.select("profile.tasks.0").pick("text").replace(0);
