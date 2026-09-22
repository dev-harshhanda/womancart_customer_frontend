export const isValidInput = (value: string) => {
  if (value === "") {
    return true;
  }
  if (value.trim() === "") {
    return false; // Reject if the value is empty or only consists of whitespace
  }

  if (
    /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g.test(
      value
    )
  ) {
    return false;
  }

  if (value.includes("  ") || value.includes("..")) {
    return false; // Reject if there are consecutive spaces or decimals
  }

  return true; // Accept the input if it meets all the conditions
};

export const isNumber = (val: any) => {
  if (val[val.length - 1] === " ") {
    return false;
  }
  // if (val.includes(".")) {
  //   return false;
  // }
  if (/^-\d+(\.\d+)?$/.test(val)) {
    return false;
  }
  // eslint-disable-next-line no-restricted-globals
  if (!isNaN(val?.trim()) || val === "") {
    return true;
  }
  return false;
};
