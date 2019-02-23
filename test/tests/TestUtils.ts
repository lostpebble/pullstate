export async function waitSeconds(seconds: number) {
  return new Promise(resolve => {
    setTimeout(resolve, 1000 * seconds);
  });
}