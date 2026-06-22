# summarize.jq
# Input: normalized array from normalize.jq
# Output: endpoint summary with status/input/response distributions

def count_by($arr):
  reduce $arr[] as $x ({}; .[$x] = ((.[ $x ] // 0) + 1));

group_by(.method + ":" + .path)
| map({
    endpoint: (.[0].method + ":" + .[0].path),
    total: length,
    byStatus: (count_by(map(.responseStatus|tostring))),
    byInputCategory: (count_by(map(.inputCategory))),
    byResponseCategory: (count_by(map(.responseCategory)))
  })
| sort_by(.endpoint)
