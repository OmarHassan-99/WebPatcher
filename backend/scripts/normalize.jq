# normalize.jq
# Input: Schemathesis HAR JSON
# Output: array of stable behavioral records

def lc: ascii_downcase;

def path_only($url):
  ($url // "")
  | sub("^https?://[^/]+"; "")
  | if . == "" then "/" else . end
  | split("?")[0];

def body_text($e):
  ($e.request.postData.text // "");

def parse_json_or_null($s):
  (try ($s | fromjson) catch null);

def NAME_MAX: 100;
def MESSAGE_MAX: 1000;

def classify_input($e):
  (body_text($e)) as $raw
  | if ($raw | length) == 0 then "empty_body"
    else
      (parse_json_or_null($raw)) as $j
      | if $j == null then "unparseable_body"
        elif ($j|type) == "null" then "null_body"
        elif ($j|type) == "array" then "array_body"
        elif ($j|type) != "object" then "scalar_body"
        else
          ($j.name // null) as $name
          | ($j.message // null) as $msg
          | ($name != null and ($name|type) != "string") as $name_wrong_type
          | ($msg  != null and ($msg |type) != "string") as $msg_wrong_type
          | if $name_wrong_type then "name_wrong_type"
            elif $msg_wrong_type then "message_wrong_type"
            else
              (if $name == null then "" else ($name|tostring) end) as $name_s
              | (if $msg  == null then "" else ($msg |tostring) end) as $msg_s
              | ($name == null or ($name_s|length)==0) as $name_missing
              | ($msg  == null or ($msg_s |length)==0) as $msg_missing
              | if $name_missing and $msg_missing then "both_fields_missing"
                elif $name_missing then "name_missing"
                elif $msg_missing then "message_missing"
                elif ($name_s|length) > NAME_MAX then "name_too_long"
                elif ($msg_s |length) > MESSAGE_MAX then "message_too_long"
                else "valid_object"
                end
            end
        end
    end;

def response_text($e):
  ($e.response.content.text // "") | tostring;

def classify_response($e):
  ($e.response.status // 0) as $st
  | (response_text($e) | lc) as $txt
  | if ($st >= 200 and $st < 300) then "success"
    elif $st == 405 then "method_not_allowed"
    elif $st == 400 then
      if   ($txt|test("invalid\\s*json|unexpected token|malformed json|json parse")) then "validation:invalid_json"
      elif ($txt|test("both.*required|name.*required.*message.*required|message.*required.*name.*required")) then "validation:both_required"
      elif ($txt|test("name.*required")) then "validation:name_required"
      elif ($txt|test("message.*required")) then "validation:message_required"
      elif ($txt|test("name.*too\\s*long|maxlength.*name|name.*length")) then "validation:name_too_long"
      elif ($txt|test("message.*too\\s*long|maxlength.*message|message.*length")) then "validation:message_too_long"
      else "validation:invalid_request_body"
      end
    else "other"
    end;

[
  (.log.entries // [])[]
  | {
      method: (.request.method // "GET"),
      path: path_only(.request.url),
      inputCategory: classify_input(.),
      responseStatus: (.response.status // 0),
      responseCategory: classify_response(.)
    }
]
